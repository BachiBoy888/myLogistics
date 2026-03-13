# Fix for PL Modal Bug

## Problem
Race condition causes PL modal to reopen after closing and become uncloseable.

## Root Cause
1. Fetch effect doesn't check if selectedId changed between request and response
2. selectedPLDetail can be set even when selectedId is null
3. selected memo uses selectedPLDetail as first priority

## Fix

### Fix 1: Add stale fetch check (PRIMARY FIX)

In `src/views/CargoView.jsx`, replace the fetch effect:

```javascript
// Fetch fresh PL detail when opening PL card
useEffect(() => {
  if (!selectedId) {
    setSelectedPLDetail(null);
    return;
  }
  
  async function fetchPLDetail() {
    const fetchForId = selectedId; // Capture ID at start
    setIsLoadingPLDetail(true);
    try {
      const freshPL = await getPLById(selectedId);
      // FIX: Ignore result if selectedId changed since we started
      if (selectedId !== fetchForId) {
        console.log('[PL Modal] Ignoring stale fetch result for PL:', fetchForId);
        return;
      }
      setSelectedPLDetail(freshPL);
    } catch (e) {
      console.error('Failed to fetch PL detail:', e);
      setSelectedPLDetail(null);
    } finally {
      setIsLoadingPLDetail(false);
    }
  }
  
  fetchPLDetail();
}, [selectedId]);
```

### Fix 2: Fix Escape handler

In `src/views/CargoView.jsx`, around line 551, add `setSelectedPLDetail(null)`:

```javascript
useEffect(() => {
  const handleEsc = (e) => {
    if (e.key === "Escape") {
      setSelectedId(null);
      setSelectedPLDetail(null); // FIX: Add this line
      setOpenConsId(null);
      setShowNew(false);
      setShowCreateCons(false);
      setSelectedPLs([]);
    }
  };
  window.addEventListener("keydown", handleEsc);
  return () => window.removeEventListener("keydown", handleEsc);
}, []);
```

### Fix 3: Alternative - Fix selected memo (OPTIONAL)

If you prefer, you can also change the selected memo to require selectedId:

```javascript
const selected = useMemo(
  () => {
    // FIX: Require selectedId to be set
    if (!selectedId) return null;
    return selectedPLDetail ?? safePLs.find((p) => p.id === selectedId) ?? null;
  },
  [safePLs, selectedId, selectedPLDetail]
);
```

This makes the dependency on selectedId explicit.

## Recommended
Apply **Fix 1** (primary) and **Fix 2** (Escape handler). Fix 3 is optional but adds defense in depth.

## Testing
After applying fixes:
1. Open any PL card
2. Close it immediately (within 1 second)
3. Modal should close and stay closed
4. Press Escape should also properly close modal
5. No console errors
