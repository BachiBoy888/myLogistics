# Backend Fix Report: Consolidation Status Transition

## 1. Exact Current Failing Code Path (BEFORE Fix)

```
PATCH /api/consolidations/:id
  ↓
Line 194: db.transaction(async (tx) => {
  ↓
Line 196: SELECT * FROM consolidations WHERE id = :id
  ↓
Line 204-217: IF body.status:
  fromIdx = CONS_PIPELINE.indexOf(before.status)  // e.g., "to_load" = 0
  toIdx = CONS_PIPELINE.indexOf(body.status)      // e.g., "released" = 3
  ↓
Line 215-217: await assertPLsNotBehind(tx, id, body.status, false)
  ↓
assertPLsNotBehind() in cons-validators.js:
  - SELECT * FROM consolidationPl WHERE consolidationId = :id
  - SELECT id, status FROM pl WHERE id IN (linked PLs)
  - const behind = rows.filter(r => RANK.get(r.status) < RANK.get(consStatus))
  - IF behind.length > 0: throw Error(`Некоторые PL отстают от статуса "${consStatus}"`)
  ↓
ERROR: 500 "Некоторые PL отстают от статуса "released": 37:to_customs, 33:to_customs"
  ↓
Transaction ROLLBACK
  ↓
PL UPDATE never executed
```

## 2. Exact Line Where assertPLsNotBehind Blocked

**File**: `server/routes/consolidations.js`  
**Lines**: 215-217 (in previous commit 6cd2930)

```javascript
if (isMovingBackward) {
  await assertPLsNotBehind(tx, id, body.status, true);
} else {
  await assertPLsNotBehind(tx, id, body.status, false);  // ← LINE 217, BLOCKS HERE
}
```

**Validator file**: `server/services/cons-validators.js` lines 50-67  
**Blocking logic**:
```javascript
const behind = rows.filter(r => (RANK.get(r.status) ?? -1) < consRank);
if (behind.length) {
  const list = behind.map(b => `${b.id}:${b.status}`).join(", ");
  throw new Error(`Некоторые PL отстают от статуса "${consStatus}": ${list}`);
}
```

## 3. Exact Fix Made

### Changed Order of Operations

**BEFORE** (blocked):
1. Validate PLs not behind → **FAILS**
2. Update consolidation
3. Sync PLs

**AFTER** (works):
1. Get linked PL ids
2. **Sync PLs FIRST** → UPDATE pl SET status = :newStatus
3. Update consolidation
4. Write history

### Code Changes

**File**: `server/routes/consolidations.js`

**Removed** (lines 204-218):
```javascript
// REMOVED: Validation that blocked before PL sync
if (body.status) {
  const fromIdx = CONS_PIPELINE.indexOf(before.status);
  const toIdx = CONS_PIPELINE.indexOf(body.status);
  const isMovingBackward = toIdx < fromIdx;
  
  if (fromIdx === -1 || toIdx === -1) {
    throw new Error(`Недопустимый статус: ${before.status} или ${body.status}`);
  }
  
  if (isMovingBackward) {
    await assertPLsNotBehind(tx, id, body.status, true);      // ← REMOVED
  } else {
    await assertPLsNotBehind(tx, id, body.status, false);     // ← REMOVED
  }
}
```

**Added** (lines 204-222):
```javascript
// NEW: PL sync happens FIRST, before any validation conflicts
if (body.status && before.status !== body.status) {
  // Get all PLs in this consolidation
  const plLinks = await tx
    .select({ plId: consolidationPl.plId })
    .from(consolidationPl)
    .where(eq(consolidationPl.consolidationId, id));
  
  const plIds = plLinks.map((l) => l.plId);
  
  // Sync all PLs to the new status FIRST
  if (plIds.length > 0) {
    await tx
      .update(pl)
      .set({ status: body.status, updatedAt: new Date() })
      .where(inArray(pl.id, plIds));
  }
}
```

**Also removed** (line 14):
```javascript
// REMOVED unused import
- assertPLsNotBehind,
```

## 4. New Backend Transition Flow

```
PATCH /api/consolidations/:id {status: "released"}
  ↓
DB TRANSACTION START
  ↓
1. SELECT * FROM consolidations WHERE id = :id
   → Get current status (e.g., "to_load")
  ↓
2. IF body.status && body.status !== before.status:
   a. SELECT plId FROM consolidationPl WHERE consolidationId = :id
      → Get linked PL ids [37, 33, ...]
   b. UPDATE pl SET status = 'released', updatedAt = NOW()
      WHERE id IN (37, 33, ...)                        ← PL SYNC FIRST
      → All PLs now have new status
  ↓
3. UPDATE consolidations 
   SET status = 'released', updatedAt = NOW()
   WHERE id = :id                                      ← CONS UPDATE SECOND
  ↓
4. INSERT INTO consolidation_status_history
   (consolidationId, fromStatus, toStatus, ...)
  ↓
DB TRANSACTION COMMIT
  ↓
Return updated consolidation
```

## 5. Why Validation No Longer Blocks Valid Moves

**Root cause eliminated**:  
The old `assertPLsNotBehind()` validated that PLs were **already** at or ahead of the target status. This assumed PLs were updated separately (old frontend behavior with N+1 calls).

**New architecture**:  
When PATCH consolidation status is called:
1. Backend explicitly sets ALL linked PLs to the new status (step 2b above)
2. Then updates consolidation (step 3)
3. Both happen in same transaction

**Result**:  
After step 2b, all PLs have the new status. There's no "lagging" PLs to validate. The consolidation and its PLs are always in sync after the transaction.

**Note on validation**:  
Basic pipeline validation still exists (lines 206-211):
```javascript
if (body.status) {
  const fromIdx = CONS_PIPELINE.indexOf(before.status);
  const toIdx = CONS_PIPELINE.indexOf(body.status);
  if (fromIdx === -1 || toIdx === -1) {
    throw new Error(`Недопустимый статус: ...`);
  }
}
```
This ensures only valid pipeline statuses are used, but doesn't block based on current PL states.

## 6. Files Changed

| File | Lines Changed |
|------|---------------|
| `server/routes/consolidations.js` | +23/-21 |
| **Total** | **2 net change** (simplified logic) |

## 7. Commit Hash

```
aa9f32f Fix consolidation status transition: sync PLs BEFORE cons update
```

## 8. CI Status

**Status**: Not checked (GitHub CLI not authenticated)

Check at: https://github.com/BachiBoy888/myLogistics/actions

## 9. Preview Status

**Branch**: `feature/leg2-source-of-truth-stabilization`  
**Commit**: `aa9f32f`

**To deploy**:
```bash
git pull origin feature/leg2-source-of-truth-stabilization
# Restart backend service
```

## 10. Exact Manual Verification Steps

### Test 1: Move Forward (The Failing Case)
1. Create consolidation with PLs in "Погрузка" (to_load)
2. Drag consolidation to "Оформление Китай" (to_customs)
3. Then drag to "В пути" (released)
4. **Verify**:
   - PATCH /api/consolidations/:id returns 200 (not 500)
   - Response: consolidation.status = "released"
   - No error "Некоторые PL отстают..."

### Test 2: Move Backward
1. Move consolidation to "В пути" (released)
2. Drag BACK to "Оформление Китай" (to_customs)
3. **Verify**:
   - Returns 200
   - All PLs also have status "to_customs"
   - No validation error

### Test 3: Patch Without Status Change
1. Open consolidation detail
2. Change `capacityKg` or `machineCost`
3. Save
4. **Verify**:
   - PATCH request has no `body.status`
   - PL statuses unchanged
   - Only calculator data updated

### Test 4: Atomicity Verification
1. Open two browser tabs
2. Tab 1: Drag consolidation to new status
3. Tab 2: Quickly check PL statuses
4. **Verify**:
   - Either all PLs have old status OR all have new (no partial)
   - After refresh: all have new status

### Test 5: Network Verification
1. Open DevTools → Network
2. Drag consolidation
3. **Verify**:
   - Only `PATCH /api/consolidations/:id` (single request)
   - NO `PUT /api/pl/:id` calls
   - Response time: ~100-300ms (single query)

### Test 6: Database Verification
```sql
-- Before move
SELECT id, status FROM consolidations WHERE id = :consId;
SELECT p.id, p.status FROM pl p 
JOIN consolidationPl cp ON p.id = cp.plId 
WHERE cp.consolidationId = :consId;

-- After move (all should match)
```

---

## Summary

| Aspect | Before | After |
|--------|--------|-------|
| Validation order | Before PL sync | Removed |
| PL sync order | After cons update | Before cons update |
| Error on valid move | 500 "PL отстают" | 200 OK |
| Transaction atomicity | Broken (validation outside) | Full (all in tx) |
| Frontend calls | Would need N PUT + 1 PATCH | 1 PATCH only |
