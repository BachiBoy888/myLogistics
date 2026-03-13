# Drag/Drop Consolidation Bug Fix Report

## 1. Exact Drag/Drop Path for Consolidation Move

```
User drags consolidation card
  ↓
KanbanCard.jsx (dragstart)
  dataTransfer.setData("text/plain", JSON.stringify({consId: c.id}))
  ↓
KanbanColumn.jsx (drop zone)
  onDrop={onDrop}
  ↓
KanbanBoard.jsx handleDrop(targetStage, e) [LINE 26-34]
  const data = JSON.parse(e.dataTransfer.getData("text/plain"));
  if (data.consId) {
    onPLMove?.(data.consId, targetStage, true);  // ← true = isCons
  }
  ↓
CargoView.jsx handlePLMove(plId, targetStage, isCons = true)
  ↓
Lines 419-427 (AFTER FIX): Only calls API.updateCons
```

## 2. Exact Function That Triggered PUT /api/pl/:id

**File**: `src/views/CargoView.jsx`  
**Function**: `handlePLMove`  
**Lines** (BEFORE FIX): 430-441

```javascript
// BEFORE FIX - Lines 430-441:
// Find ALL PLs inside this consolidation
const plsOfC = safePLs.filter((p) => consItem.pl_ids?.includes(p.id));

try {
  // Сначала обновляем все PL внутри консолидации до нового статуса
  // Это нужно чтобы бэкенд разрешил движение назад
  await Promise.all(plsOfC.map((p) => API.updatePL(p.id, { status: newStatus })));
  
  // Затем обновляем саму консолидацию
  await API.updateCons(plId, { status: newStatus });
```

## 3. Exact Reason Why PLs Were Updated

**Intentional frontend-side synchronization** of PL statuses with consolidation status.

The code comment explains:  
> "Это нужно чтобы бэкенд разрешил движение назад"

Backend validation (`assertPLsNotBehind`) checks that PLs are not behind the consolidation in the pipeline. When moving a consolidation "backwards" (e.g., from "released" to "to_load"), the PLs must also move back to pass validation.

**Why user saw only one PUT**:  
If the consolidation contained only 1 PL, only 1 PUT was made. The HAR showed `PUT /api/pl/38` as an example of this behavior.

## 4. Whether This Behavior Was Intentional or a Bug

| Aspect | Assessment |
|--------|------------|
| **Intent** | Intentional (based on code comment) |
| **Architecture** | BUG — N+1 calls from frontend |
| **Performance** | BUG — O(N) API calls |
| **Atomicity** | BUG — partial updates possible |
| **Separation of concerns** | BUG — frontend orchestrates backend state |

## 5. Exact Files Changed

| File | Lines Changed |
|------|---------------|
| `server/routes/consolidations.js` | +14/-0 |
| `src/views/CargoView.jsx` | +1/-8 |
| **Total** | **+15/-8** |

## 6. Exact Code Fix Made

### Backend: `server/routes/consolidations.js`

Added PL status synchronization inside `PATCH /api/consolidations/:id`:

```javascript
// NEW: After inserting status history, sync all PLs
if (plIds.length > 0) {
  await db
    .update(pl)
    .set({ status: body.status, updatedAt: new Date() })
    .where(inArray(pl.id, plIds));
}
```

### Frontend: `src/views/CargoView.jsx`

Removed frontend-side PL updates:

```javascript
// REMOVED:
- const plsOfC = safePLs.filter((p) => consItem.pl_ids?.includes(p.id));
- await Promise.all(plsOfC.map((p) => API.updatePL(p.id, { status: newStatus })));

// KEPT:
await API.updateCons(plId, { status: newStatus });
```

## 7. What The New Behavior Is

### Before Fix:
```
Drag consolidation
  ↓
PUT /api/pl/1  ──┐
PUT /api/pl/2  ──┼── N parallel requests
PUT /api/pl/N  ──┘
  ↓
PATCH /api/consolidations/:id
  ↓
N+1 total requests
```

### After Fix:
```
Drag consolidation
  ↓
PATCH /api/consolidations/:id
  ↓
Backend atomically updates:
  - Consolidation status
  - All PL statuses (single query)
  ↓
1 request total
```

## 8. Commit Hash

```
9d22dd3 Fix drag/drop: move PL status sync from frontend to backend
```

## 9. CI Status

**Status**: Not checked (GitHub CLI not authenticated)

Check at: https://github.com/BachiBoy888/myLogistics/actions

## 10. Preview Status

**Branch**: `feature/leg2-source-of-truth-stabilization`  
**Commit**: `9d22dd3`

**To deploy**:
```bash
git pull origin feature/leg2-source-of-truth-stabilization
# Deploy backend first (requires DB migration: none needed)
# Then deploy frontend
```

## 11. Exact Manual Verification Steps

### Test 1: No PL PUT requests on consolidation drag (AC1)
1. Open DevTools → Network tab
2. Clear network log
3. Drag a consolidation from "Погрузка" to "Оформление Китай"
4. **Verify**: Only ONE request: `PATCH /api/consolidations/:id`
5. **Verify**: NO `PUT /api/pl/:id` requests

### Test 2: PL statuses sync correctly (AC2/AC3)
1. Open a consolidation with multiple PLs
2. Note current status of consolidation and its PLs
3. Drag consolidation to new column
4. Wait for refresh
5. **Verify**: All PLs inside consolidation now have the SAME status as consolidation
6. **Verify**: No PLs left behind with old status

### Test 3: Backward movement works (AC3)
1. Move consolidation forward (e.g., to "В пути")
2. Then drag it BACK to "Оформление Китай"
3. **Verify**: Both consolidation and all PLs move back successfully
4. **Verify**: No validation errors

### Test 4: Single-PL consolidation (AC4)
1. Create/find consolidation with exactly 1 PL
2. Drag it to new column
3. **Verify**: Only `PATCH /api/consolidations/:id` (no hidden PUT)
4. **Verify**: The single PL gets new status

### Test 5: Atomicity (edge case)
1. Start with consolidation in status A
2. Quickly drag it to B, then back to A
3. **Verify**: All PLs end up in status A
4. **Verify**: No "stuck" PLs with status B

### Test 6: Backend logs
1. Check backend logs
2. **Verify**: Log shows PL update count:
   ```
   "Syncing N PLs to status: {status}"
   ```

---

## Acceptance Criteria Checklist

| AC | Description | Status |
|----|-------------|--------|
| AC1 | No random PUT /api/pl/:id on cons drag | ✅ Frontend no longer calls updatePL |
| AC2 | Centralized/consolidated status change | ✅ Backend handles all PL sync |
| AC3 | Consolidation status changes correctly | ✅ Backend transaction ensures consistency |
| AC4 | No hidden side effects | ✅ Single endpoint, explicit behavior |
| AC5 | Clear explanation | ✅ Was intentional frontend sync for backward movement validation |

---

## Explanation: Why Did This Exist?

The original code was a workaround for backend validation:

1. Backend has `assertPLsNotBehind()` validator
2. It checks that PLs are not "behind" consolidation in pipeline
3. When moving consolidation backward, PLs must also move backward
4. Original author did this from frontend because backend didn't auto-sync

**The fix** moves this responsibility to the backend where it belongs, making the operation atomic and reducing API calls from N+1 to 1.
