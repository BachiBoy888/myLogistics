# Drag/Drop Consolidation Bug Investigation Report

## 1. Exact Drag/Drop Path for Consolidation Move

```
User drags consolidation card
  ↓
KanbanCard (drag start) → dataTransfer.setData("text/plain", {consId: c.id})
  ↓
KanbanColumn (drop zone) → onDrop
  ↓
KanbanBoard.jsx handleDrop()
  ↓
Line 32: if (data.consId) { onPLMove?.(data.consId, targetStage, true) }
  ↓
CargoView.jsx handlePLMove(plId, targetStage, isCons = true)
  ↓
Lines 430-441: Intentionally updates ALL PLs in consolidation
```

## 2. Exact Function That Triggers PUT /api/pl/:id

**File**: `src/views/CargoView.jsx`  
**Function**: `handlePLMove` (lines 398-470)  
**Specific lines**: 438

```javascript
// Lines 430-441
const plsOfC = safePLs.filter((p) => consItem.pl_ids?.includes(p.id));

try {
  // Сначала обновляем все PL внутри консолидации до нового статуса
  // Это нужно чтобы бэкенд разрешил движение назад
  await Promise.all(plsOfC.map((p) => API.updatePL(p.id, { status: newStatus })));
  
  // Затем обновляем саму консолидацию
  await API.updateCons(plId, { status: newStatus });
```

## 3. Exact Reason Why PLs Are Updated

**Root cause**: Frontend-side synchronization of PL statuses with consolidation status.

When consolidation moves to a new status, the code explicitly updates ALL PLs inside that consolidation to match the same status. This is done because:
- Backend validation requires PLs to be in compatible status before allowing consolidation status change
- Moving consolidation "backwards" in pipeline (e.g., from "released" to "to_load") requires PLs to also move back

**Why user sees only one PUT in HAR**: 
- If consolidation has only 1 PL inside it → 1 PUT request
- If consolidation has N PLs → N parallel PUT requests (Promise.all)
- User likely tested with single-PL consolidation

## 4. Whether This Behavior Is Intentional or a Bug

**Technically intentional** (based on code comment):  
"Это нужно чтобы бэкенд разрешил движение назад"

**Architecturally a BUG**:  
- N+1 API calls for single consolidation move
- Frontend shouldn't need to orchestrate backend state synchronization
- Race conditions possible (some PLs succeed, others fail)
- No atomicity - partial updates possible
- Violates separation of concerns

**Better architecture**:  
Backend `PATCH /api/consolidations/:id` should internally update all contained PLs atomically.

## 5. The Fix

Remove frontend-side PL status synchronization. Backend should handle this.

### File: `src/views/CargoView.jsx`

**Remove lines 430-441** (PL updates), keep only consolidation update:

```javascript
// BEFORE (lines 430-441):
const plsOfC = safePLs.filter((p) => consItem.pl_ids?.includes(p.id));

try {
  // Сначала обновляем все PL внутри консолидации до нового статуса
  await Promise.all(plsOfC.map((p) => API.updatePL(p.id, { status: newStatus })));
  
  // Затем обновляем саму консолидацию
  await API.updateCons(plId, { status: newStatus });

// AFTER:
try {
  // Backend handles PL status synchronization internally
  await API.updateCons(plId, { status: newStatus });
```

## 6. Backend Changes Required

The backend `PATCH /api/consolidations/:id` endpoint needs to internally update all PLs in the consolidation to match the new status.

**File**: `server/routes/consolidations.js`
**Endpoint**: `app.patch("/:id", ...)` (around line 140)

Need to add after consolidation update:
```javascript
// Update all PLs in this consolidation to match consolidation status
await db.update(pl)
  .set({ status: newStatus })
  .where(inArray(pl.id, consPlIds));
```

## 7. What The New Behavior Is

After fix:
1. User drags consolidation
2. Only ONE API call: `PATCH /api/consolidations/:id` with new status
3. Backend atomically updates:
   - Consolidation status
   - All PL statuses inside consolidation
4. Frontend refreshes lists

## 8. Summary

| Aspect | Before | After |
|--------|--------|-------|
| API calls | 1 + N (cons + each PL) | 1 (cons only) |
| Atomicity | No (N separate calls) | Yes (backend transaction) |
| Race conditions | Possible | Impossible |
| Backend responsibility | Validation only | Validation + sync |

## 9. Acceptance Criteria Status

| AC | Description | Fix Required |
|----|-------------|--------------|
| AC1 | No random PUT /api/pl/:id on cons drag | ✅ Frontend fix + backend enhancement |
| AC2 | Centralized/consolidated status change | ✅ Backend handles PL sync |
| AC3 | Consolidation status changes correctly | ✅ Preserved |
| AC4 | No hidden side effects | ✅ Single endpoint call |
| AC5 | Clear explanation | ✅ This report |

---

**Note**: This requires coordinated frontend + backend change. Frontend fix alone will break if backend doesn't also update PL statuses internally.
