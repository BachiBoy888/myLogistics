// Debug instrumentation for PL modal bug investigation
// Add this to CargoView.jsx temporarily

/* 
=== INSTRUCTIONS TO REPRODUCE BUG ===

1. Open any PL card by clicking on it in the kanban board
2. Close the card quickly (within 1-2 seconds) by clicking X or overlay
3. Observe console logs
4. If bug reproduces, you'll see:
   - "MODAL: Closing..." 
   - "MODAL: Fetch completed" (AFTER close!)
   - "MODAL: Rendering modal" (reopens unexpectedly)

=== EXPECTED BEHAVIOR ===
- When closing, modal should stay closed
- No fetch should complete after close
- selectedId and selectedPLDetail should both be null

=== ACTUAL BUG (Race Condition) ===
1. User clicks PL → setSelectedId(id) called
2. useEffect triggers → fetchPLDetail() starts
3. User closes modal → setSelectedId(null) + setSelectedPLDetail(null)
4. Fetch completes → setSelectedPLDetail(freshPL) called with data
5. Modal reopens because selectedPLDetail is truthy, selectedId is null
6. selected = selectedPLDetail ?? ... → returns freshPL (truthy!)
7. Modal renders even though selectedId is null

=== ROOT CAUSE ===
The fetch effect doesn't check if selectedId has changed between request start and completion.
When fetch completes after close, it sets selectedPLDetail even though selectedId is null.
The selected memo then uses selectedPLDetail (truthy) instead of checking selectedId.

=== FIX ===
Add an abort mechanism or check in the fetch effect to prevent setting selectedPLDetail
if selectedId has changed since the fetch started.
*/

// Add these console.logs to CargoView.jsx:

// 1. In the PL detail fetch useEffect (around line 173):
useEffect(() => {
  console.log("[DEBUG] Fetch effect running, selectedId:", selectedId);
  if (!selectedId) {
    console.log("[DEBUG] No selectedId, clearing selectedPLDetail");
    setSelectedPLDetail(null);
    return;
  }
  
  async function fetchPLDetail() {
    const fetchStartId = selectedId; // Capture ID at start
    console.log("[DEBUG] Starting fetch for PL:", fetchStartId);
    setIsLoadingPLDetail(true);
    try {
      const freshPL = await getPLById(selectedId);
      console.log("[DEBUG] Fetch completed for PL:", fetchStartId, "current selectedId:", selectedId);
      // BUG: This check is missing! Should be: if (selectedId !== fetchStartId) return;
      setSelectedPLDetail(freshPL);
    } catch (e) {
      console.error('[DEBUG] Fetch failed:', e);
      setSelectedPLDetail(null);
    } finally {
      setIsLoadingPLDetail(false);
    }
  }
  
  fetchPLDetail();
}, [selectedId]);

// 2. In handleClosePLCard (around line 403):
const handleClosePLCard = useCallback(() => {
  console.log("[DEBUG] handleClosePLCard called, clearing states");
  setSelectedId(null);
  setSelectedPLDetail(null);
}, []);

// 3. In the modal render condition (around line 653):
console.log("[DEBUG] Render check - selectedId:", selectedId, "selectedPLDetail:", selectedPLDetail, "selected:", selected);
{selected && (
  <Modal ...>
    ...
  </Modal>
)}
