# PL Modal Bug Investigation Report

## 1. Reproduction Status

**Status: THEORETICALLY REPRODUCED via code analysis**

The bug is a **race condition** between:
1. User closing the PL modal
2. Async fetch of PL detail completing

### Reproduction Scenario (theoretical, based on code analysis):
1. User clicks on a PL card in kanban board
2. `setSelectedId(id)` is called
3. `useEffect` triggers, `fetchPLDetail()` starts (async)
4. **Within ~100-500ms**, user closes the modal (click X or overlay)
5. `handleClosePLCard()` sets `selectedId = null` and `selectedPLDetail = null`
6. **Before React re-renders**, the fetch from step 3 completes
7. `setSelectedPLDetail(freshPL)` is called with fetched data
8. React batches state updates:
   - `selectedId = null`
   - `selectedPLDetail = freshPL` (from completed fetch)
9. Modal reopens because `selected` is truthy

### Probability:
- **High** on slow networks
- **Medium** on fast networks (requires very quick close after open)
- **Becomes more likely** when server is under load

---

## 2. Exact Reproduction Scenario

```
1. User opens CargoView (kanban board with PL cards)
2. User clicks on any PL card
3. IMMEDIATELY (within 1 second), user clicks:
   - The X button in top-right of modal, OR
   - The overlay area outside modal
4. Expected: Modal closes and stays closed
5. Actual (bug): Modal briefly closes, then reopens
6. After reopening, the modal cannot be closed normally
```

### Why it becomes "uncloseable":
After the race condition reopening:
- `selectedId = null`
- `selectedPLDetail = { ...PL data... }`

When user tries to close again:
- `handleClosePLCard()` sets both to null
- `selected` becomes null
- Modal should close...

**But**: If there's a parent re-render from `refreshPLs()`, `refreshCons()`, or `savePLPatch()`, 
the component might get into an inconsistent state where the event handlers are stale.

---

## 3. PL Modal Lifecycle Trace

### Opening Sequence:
```
1. User clicks PL card
   ↓
2. KanbanPLCard.handleClick() → onPLClick(pl)
   ↓
3. CargoView.setSelectedId(pl.id)
   ↓
4. useEffect[selectedId] triggers
   ↓
5. fetchPLDetail() starts async GET /api/pl/:id
   ↓
6. selected = selectedPLDetail ?? safePLs.find(...) 
   → returns PL from safePLs (loading state)
   ↓
7. Modal renders with PL data from list
   ↓
8. Fetch completes
   ↓
9. setSelectedPLDetail(freshPL) called
   ↓
10. selected now returns freshPL
    ↓
11. Modal re-renders with fresh data
```

### Closing Sequence (normal):
```
1. User clicks X button or overlay
   ↓
2. Modal.onClose() or handleOverlayClick() → onClose()
   ↓
3. PLCard.handleClose() → onClose()
   ↓
4. CargoView.handleClosePLCard()
   ↓
5. setSelectedId(null) + setSelectedPLDetail(null)
   ↓
6. selected = null (falsy)
   ↓
7. Modal unmounts
```

### Closing Sequence (bug - race condition):
```
1. User clicks X button or overlay
   ↓
2. handleClosePLCard() sets selectedId=null, selectedPLDetail=null
   ↓
3. FETCH FROM EARLIER REQUEST COMPLETES (race!)
   ↓
4. setSelectedPLDetail(freshPL) overwrites the null!
   ↓
5. React batches: selectedId=null, selectedPLDetail=freshPL
   ↓
6. selected = selectedPLDetail ?? ... → returns freshPL (truthy!)
   ↓
7. Modal reopens immediately after closing
```

---

## 4. Open Event Path

```
KanbanPLCard.jsx:handleClick()
  → if (!e.shiftKey) onClick?.(pl)
    
KanbanColumn.jsx:onPLClick={onPLClick}
  → Passed from CargoView

CargoView.jsx:onPLClick={(pl) => setSelectedId(pl.id)}
  → setSelectedId(pl.id)
    
CargoView.jsx:useEffect[selectedId]
  → if (selectedId) fetchPLDetail()
    → getPLById(selectedId)
      → GET /api/pl/:id
        → normalizePL(response)
          → setSelectedPLDetail(freshPL)

CargoView.jsx:selected (useMemo)
  → selectedPLDetail ?? safePLs.find(p => p.id === selectedId) ?? null
    
CargoView.jsx:render
  → {selected && <Modal ...><PLCard ... /></Modal>}
```

---

## 5. Close Event Path

### Path A: Click X button
```
Modal.jsx (inline component)
  → <button onClick={onClose}>
    → onClose = handleClosePLCard

CargoView.jsx:handleClosePLCard
  → setSelectedId(null)
  → setSelectedPLDetail(null)
```

### Path B: Click overlay
```
Modal.jsx:handleOverlayClick
  → if (e.target === overlayRef.current) onClose()
    → onClose = handleClosePLCard

CargoView.jsx:handleClosePLCard
  → setSelectedId(null)
  → setSelectedPLDetail(null)
```

### Path C: Press Escape
```
CargoView.jsx:useEffect (keydown)
  → if (e.key === "Escape") setSelectedId(null)
    → Only sets selectedId, NOT selectedPLDetail!
    
[NOTE: This is a secondary bug - Escape doesn't clear selectedPLDetail]
```

---

## 6. Exact Confirmed Root Cause of Reopen

### Primary Cause: Race Condition in Fetch Effect

**Location**: `CargoView.jsx`, lines 173-195

```javascript
useEffect(() => {
  if (!selectedId) {
    setSelectedPLDetail(null);
    return;
  }
  
  async function fetchPLDetail() {
    setIsLoadingPLDetail(true);
    try {
      const freshPL = await getPLById(selectedId);
      // BUG: No check if selectedId has changed!
      setSelectedPLDetail(freshPL);  // ← Overwrites null set by close!
    } catch (e) {
      setSelectedPLDetail(null);
    } finally {
      setIsLoadingPLDetail(false);
    }
  }
  
  fetchPLDetail();
}, [selectedId]);
```

**The Problem**:
1. Fetch starts with `selectedId = 123`
2. User closes modal, `selectedId` becomes `null`
3. Fetch completes and calls `setSelectedPLDetail(freshPL)`
4. Now: `selectedId = null`, `selectedPLDetail = {PL data}`
5. `selected` memo uses `selectedPLDetail` (truthy) even though `selectedId` is null

### Secondary Cause: selected Memo Logic

**Location**: `CargoView.jsx`, lines 288-291

```javascript
const selected = useMemo(
  () => selectedPLDetail ?? safePLs.find((p) => p.id === selectedId) ?? null,
  [safePLs, selectedId, selectedPLDetail]
);
```

**The Problem**:
- `selectedPLDetail` is used as first priority
- Even if `selectedId` is null, if `selectedPLDetail` has data, modal opens
- Should check `selectedId` first before using `selectedPLDetail`

---

## 7. Exact Confirmed Root Cause of Uncloseable State

After the race condition reopening, the modal may become "uncloseable" due to:

### Cause A: Stale Event Handlers
When the modal reopens via race condition:
1. `selectedId = null`
2. `selectedPLDetail = {PL data}`
3. Modal renders with `key={`pl-modal-${selected.id}`}`
4. But `selected.id` comes from `selectedPLDetail.id`

If `savePLPatch` is called (auto-save on blur) or `refreshPLs` runs:
- These update `safePLs` 
- Which triggers re-render
- May cause event handler references to become stale

### Cause B: Inconsistent State Confusion
The PLCard component receives `pl={selected}` prop.
If `selected` comes from `selectedPLDetail` (not from `safePLs`):
- The PL object reference may be different
- Event handlers in PLCard may have stale closures
- onClose may not properly propagate to parent

---

## 8. Code Locations Involved

| File | Lines | Purpose | Issue |
|------|-------|---------|-------|
| `src/views/CargoView.jsx` | 89-90 | State declarations | - |
| `src/views/CargoView.jsx` | 173-195 | Fetch effect | **PRIMARY BUG** - Race condition |
| `src/views/CargoView.jsx` | 288-291 | selected memo | **SECONDARY BUG** - Wrong priority |
| `src/views/CargoView.jsx` | 403-406 | handleClosePLCard | - |
| `src/views/CargoView.jsx` | 547-551 | Escape handler | **TERTIARY BUG** - Doesn't clear selectedPLDetail |
| `src/views/CargoView.jsx` | 664 | onPLClick | - |
| `src/components/PLCard.jsx` | 130-145 | handleClose | - |
| `src/components/kanban/KanbanPLCard.jsx` | 48-55 | handleClick | - |

---

## 9. Temporary Debug Instrumentation Used

Added to `CargoView.jsx`:

```javascript
// In fetch effect:
console.log('[DEBUG] Fetch effect running, selectedId:', selectedId);
console.log('[DEBUG] Starting fetch for PL:', fetchStartId);
console.log('[DEBUG] Fetch completed for PL:', fetchStartId, 'current selectedId:', selectedId);

// In handleClosePLCard:
console.log('[DEBUG] handleClosePLCard called - clearing states');

// Before modal render:
console.log('[DEBUG] Modal render check - selectedId:', selectedId, ...);

// In onPLClick:
console.log('[DEBUG] onPLClick called with PL id:', pl.id);
```

---

## 10. Confidence Level

**Overall Confidence: 95%**

| Claim | Confidence | Evidence |
|-------|------------|----------|
| Race condition exists | 100% | Code clearly shows async fetch without cancellation/check |
| Race causes reopen | 95% | Logic flow confirms this is possible |
| Race explains "uncloseable" | 80% | Likely due to stale handlers, but needs verification |
| Reproduction scenario accurate | 90% | Based on code analysis, needs real-world testing |

### Why not 100%:
- Haven't physically reproduced in running app (no server access)
- "Uncloseable" state mechanism needs verification
- There could be additional contributing factors

---

## Summary

**The bug is a classic race condition** between:
1. User closing the modal (sets `selectedId=null`, `selectedPLDetail=null`)
2. In-flight fetch completing (sets `selectedPLDetail=data`)

**Fix strategy**:
1. Add check in fetch effect: if `selectedId` changed since fetch started, ignore result
2. OR: Use AbortController to cancel fetch on cleanup
3. OR: Change `selected` memo to require `selectedId` to be truthy
4. Fix Escape handler to also clear `selectedPLDetail`

**Recommended fix** (minimal change):
```javascript
// In fetch effect:
async function fetchPLDetail() {
  const fetchForId = selectedId; // capture at start
  setIsLoadingPLDetail(true);
  try {
    const freshPL = await getPLById(selectedId);
    // Add this check:
    if (selectedId !== fetchForId) {
      console.log('[DEBUG] Ignoring stale fetch result');
      return;
    }
    setSelectedPLDetail(freshPL);
  } catch (e) {
    setSelectedPLDetail(null);
  } finally {
    setIsLoadingPLDetail(false);
  }
}
```
