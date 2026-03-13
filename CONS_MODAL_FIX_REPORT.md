# Consolidation Modal Architecture Fix Report

## 1. Exact Old Consolidation Open Flow

### BEFORE (problematic flow):
```
1. User clicks consolidation in kanban
   ↓
2. setOpenConsId(id) called
   ↓
3. Modal opens IMMEDIATELY with data from safeCons.find()
   ↓
   cons={safeCons.find((c) => c.id === openConsId)}
   ↓
4. ConsolidationDetailsModal receives stale list data
   ↓
5. User sees STALE values:
      - capacityKg, capacityCbm
      - machineCost
      - expenses
      - plDetails (allocatedLeg2Usd)
   ↓
6. Save operations update via refreshCons() only
   ↓
7. After save, list data may still be stale
   ↓
8. User closes modal, reopens → sees same stale data
   ↓
9. Only F5 (full page reload) fixes it
```

### Root causes identified:
1. **No fresh detail endpoint call** on open
2. **Fallback to list data** as source of truth
3. **No deterministic refresh** after save
4. **Parent list state** controls modal content

---

## 2. Exact Reason Stale Data Appears After Save/Reopen

### Problem A: List data as source of truth
```javascript
// BEFORE in CargoView.jsx:
cons={safeCons.find((c) => c.id === openConsId)}
```
Modal always rendered from `safeCons` list, not from fresh API call.

### Problem B: Save only refreshed list, not detail
```javascript
// BEFORE onSavePLs:
await Promise.all([refreshCons(), refreshPLs()]);
// Only list refreshed, modal still shows old prop data
```

### Problem C: No fresh detail fetch after update
```javascript
// BEFORE onUpdateCons:
await API.updateCons(id, patch);
if (!skipRefresh) {
  await refreshCons();  // List only, no detail refresh
}
```

### Problem D: Reopen uses cached prop
```javascript
// BEFORE: cons prop comes from safeCons.find()
// No new API call when reopening same consolidation
```

---

## 3. Exact Frontend Changes Made

### File: `src/views/CargoView.jsx`

#### Change 3.1: Added consolidation detail state (lines 97-99)
```javascript
// Fresh Consolidation detail state - fetched individually when opening consolidation
const [selectedConsDetail, setSelectedConsDetail] = useState(null);
const [isLoadingConsDetail, setIsLoadingConsDetail] = useState(false);
```

#### Change 3.2: Added API.getCons (line 64)
```javascript
getCons: api?.getConsolidation || apiGetCons,
```

#### Change 3.3: Added useEffect for fresh detail fetch (lines 207-237)
```javascript
// Fetch fresh Consolidation detail when opening consolidation modal
useEffect(() => {
  if (!openConsId) {
    setSelectedConsDetail(null);
    return;
  }

  const abortController = new AbortController();
  const requestId = openConsId;

  async function fetchConsDetail() {
    setIsLoadingConsDetail(true);
    try {
      const freshCons = await API.getCons(openConsId);
      // Guard: ignore stale response if ID changed or aborted
      if (abortController.signal.aborted || openConsId !== requestId) {
        return;
      }
      setSelectedConsDetail(freshCons);
    } catch (e) {
      if (abortController.signal.aborted) return;
      setSelectedConsDetail(null);
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoadingConsDetail(false);
      }
    }
  }

  fetchConsDetail();

  return () => {
    abortController.abort();
  };
}, [openConsId]);
```

#### Change 3.4: Added selectedCons memo (lines 405-412)
```javascript
// Только fresh данные консолидации из API. Не используем fallback из списка.
const selectedCons = useMemo(
  () => {
    if (!openConsId || !selectedConsDetail) return null;
    return selectedConsDetail;
  },
  [openConsId, selectedConsDetail]
);
```

#### Change 3.5: Added isConsLoading (lines 414-415)
```javascript
// Состояние загрузки консолидации для показа skeleton
const isConsLoading = openConsId !== null && (isLoadingConsDetail || !selectedConsDetail);
```

#### Change 3.6: Updated Escape handler (line 626)
```javascript
setSelectedConsDetail(null); // Ensure cons detail is cleared on Escape
```

#### Change 3.7: Added skeleton UI (lines 834-853)
```jsx
{/* Loading Skeleton for Consolidation */}
{isConsLoading && (
  <Modal onClose={() => setOpenConsId(null)}>
    <div className="bg-white rounded-2xl shadow-sm border p-6 max-w-4xl w-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
        <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="space-y-4">
        <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
        <div className="h-32 w-full bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
  </Modal>
)}
```

#### Change 3.8: Updated modal render to use selectedCons (line 855)
```jsx
{/* Actual Consolidation Detail - только после загрузки fresh данных */}
{selectedCons && (
  <Modal onClose={() => setOpenConsId(null)}>
    <ConsolidationDetailsModal
      cons={selectedCons}  // ← was: safeCons.find(...)
```

#### Change 3.9: Updated onDissolve to clear detail (line 866)
```javascript
setOpenConsId(null);
setSelectedConsDetail(null);  // ← added
```

#### Change 3.10: Updated onSavePLs to refresh detail (lines 873-882)
```javascript
await Promise.all([refreshCons(), refreshPLs()]);
// Refresh fresh detail for this consolidation ← added
if (openConsId) {
  try {
    const freshCons = await API.getCons(id);
    setSelectedConsDetail(freshCons);
  } catch (e) {
    console.error('Failed to refresh cons detail after save:', e);
  }
}
```

#### Change 3.11: Updated onUpdateCons to refresh detail (lines 900-909)
```javascript
await refreshCons();
// Refresh fresh detail for this consolidation ← added
try {
  const freshCons = await API.getCons(id);
  setSelectedConsDetail(freshCons);
} catch (e) {
  console.error('Failed to refresh cons detail after update:', e);
}
```

#### Change 3.12: Updated onRefresh to refresh detail (lines 916-925)
```javascript
await Promise.all([refreshCons(), refreshPLs()]);
// Refresh fresh detail ← added
if (openConsId) {
  try {
    const freshCons = await API.getCons(openConsId);
    setSelectedConsDetail(freshCons);
  } catch (e) {
    console.error('Failed to refresh cons detail:', e);
  }
}
```

---

## 4. Exact Backend/API Changes Made

**No backend changes required.**

Endpoint `GET /api/consolidations/:id` already existed and returns:
- Full consolidation data
- plIds, plLoadOrders, plDetails (with allocatedLeg2Usd)
- expenses
- capacityKg, capacityCbm, machineCost

---

## 5. How Consolidation Modal Is Hydrated Now

### New flow:
```
1. User clicks consolidation in kanban
   ↓
2. setOpenConsId(id) called
   ↓
3. useEffect[openConsId] triggers
   ↓
4. GET /api/consolidations/:id starts
   ↓
5. isConsLoading = true → Skeleton shown
   ↓
6. Fresh detail arrives
   ↓
7. setSelectedConsDetail(freshData)
   ↓
8. isConsLoading = false
   ↓
9. selectedCons truthy → Modal renders with fresh data
   ↓
10. ConsolidationDetailsModal receives only fresh detail
```

### Hydration rules:
| Condition | Render |
|-----------|--------|
| `isConsLoading === true` | Skeleton only |
| `selectedCons === null` | Nothing (or skeleton) |
| `selectedCons !== null` | ConsolidationDetailsModal with fresh data |

---

## 6. How Save Flow Works Now

### Save PLs flow:
```
1. User saves PLs in consolidation
   ↓
2. API.setConsPLs() called
   ↓
3. refreshCons() + refreshPLs() (update lists)
   ↓
4. API.getCons(id) called ← NEW
   ↓
5. setSelectedConsDetail(freshCons) ← NEW
   ↓
6. Modal re-renders with fresh data
```

### Update cons flow:
```
1. User updates capacity/machineCost/etc
   ↓
2. API.updateCons() called
   ↓
3. refreshCons() (update list)
   ↓
4. API.getCons(id) called ← NEW
   ↓
5. setSelectedConsDetail(freshCons) ← NEW
   ↓
6. Modal shows fresh values immediately
```

### Key improvement:
- After save/update, modal **immediately** shows fresh data
- No intermediate stale state
- No dependency on list refresh timing

---

## 7. Whether Stale List Fallback Was Fully Removed

### YES - Fully removed.

| Location | Before | After |
|----------|--------|-------|
| Modal render | `safeCons.find(...)` | `selectedCons` (fresh only) |
| selectedCons | N/A | `selectedConsDetail` only, no fallback |
| Skeleton | N/A | `isConsLoading` shows skeleton |

### Guarantees:
1. ✅ Modal never renders from list data
2. ✅ Modal only renders after fresh API response
3. ✅ No intermediate "stale → fresh" flash
4. ✅ Save/reopen always shows fresh data
5. ✅ Escape/clear always resets to null

---

## 8. Files Changed

| File | Lines Changed |
|------|---------------|
| `src/views/CargoView.jsx` | +98/-2 |
| **Total** | **98 insertions, 2 deletions** |

---

## 9. Commit Hash

```
757ad6e Fix consolidation modal: fresh detail only, no stale fallback, skeleton loading
```

---

## 10. CI Status

**Status**: Not checked (GitHub CLI not authenticated)

Check at: https://github.com/BachiBoy888/myLogistics/actions

---

## 11. Preview Status

**Branch**: `feature/leg2-source-of-truth-stabilization`  
**Commit**: `757ad6e`

**To deploy**:
```bash
git pull origin feature/leg2-source-of-truth-stabilization
# Deploy to your preview environment
```

---

## 12. Exact Manual Verification Steps

### Test 1: Fresh data on open (AC1)
1. Open kanban board
2. Click on any consolidation
3. **Expected**: Skeleton shown immediately (no old data)
4. Wait 1-3 seconds
5. **Expected**: Modal appears with fresh data
6. **Verify**: Capacity, machine cost, expenses are fresh

### Test 2: No stale values visible (AC2)
1. Open DevTools → Network tab
2. Throttle to "Slow 3G"
3. Click consolidation
4. **Verify**: Skeleton shown during load, no old values flash
5. **Verify**: Calculator values appear only after detail load

### Test 3: Skeleton loading state (AC3)
1. Click consolidation
2. **Expected**: Gray skeleton with animated pulse
3. **Verify**: No "loading" text or spinner (clean skeleton)
4. Wait for load
5. **Expected**: Smooth transition to actual content

### Test 4: Save flow deterministic (AC4)
1. Open consolidation
2. Change capacity or machine cost
3. Save changes
4. **Expected**: Modal updates immediately with fresh data
5. Close modal
6. Reopen same consolidation
7. **Expected**: Saved values persist (no stale revert)

### Test 5: Reopen behavior (AC5)
1. Open consolidation, note values
2. Close modal (don't refresh page)
3. Have another user/admin change same consolidation
4. Reopen consolidation
5. **Expected**: Fresh values from API (not cached)
6. **Verify**: Values match current database state

### Test 6: No list fallback (AC6)
1. Open consolidation
2. In DevTools, block `GET /api/consolidations/:id` request
3. **Expected**: Skeleton stays, no fallback render
4. Unblock request
5. **Expected**: Fresh data loads and renders

### Test 7: Post-reload consistency (AC7)
1. Make changes to consolidation
2. Save
3. Press F5 to reload page
4. Open same consolidation
5. **Expected**: Values after reload match values immediately after save

---

## Acceptance Criteria Checklist

| AC | Description | Status |
|----|-------------|--------|
| AC1 | Detail modal uses only GET /api/consolidations/:id | ✅ Implemented |
| AC2 | No stale calculator values visible | ✅ Skeleton prevents flash |
| AC3 | Skeleton shown during load | ✅ isConsLoading state |
| AC4 | Save deterministic, no stale revert | ✅ Fresh fetch after save |
| AC5 | Reopen loads fresh data | ✅ useEffect on openConsId |
| AC6 | No list data as source of truth | ✅ selectedCons only |
| AC7 | Post-reload consistency | ✅ Same fresh data source |

---

## Summary

| Aspect | Before | After |
|--------|--------|-------|
| Source of truth | `safeCons.find()` (list) | `GET /api/consolidations/:id` |
| Initial render | Stale list data | Skeleton → fresh data |
| After save | List refresh only | Detail refresh + list refresh |
| After reopen | Cached prop | Fresh API call |
| Loading state | None (stale data) | Skeleton UI |
| Escape/clear | `openConsId = null` | Also clears `selectedConsDetail` |
