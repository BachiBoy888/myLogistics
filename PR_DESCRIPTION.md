## Summary

This PR fixes 6 UI and calculation issues identified in the myLogistics cargo/consolidation modules.

## Issues Fixed

### 1. Consolidation Title Must Open Consolidation
- **File:** src/components/kanban/KanbanConsCard.jsx
- **Fix:** Made consolidation title clickable to open consolidation details
- **Behavior:** Clicking title uses same handler as existing "Открыть консолидацию" action
- **Preserved:** Drag-and-drop functionality works as before

### 2. Duplicate Close Button in Cargo Card
- **File:** src/views/CargoView.jsx
- **Fix:** Removed close button from Modal wrapper component
- **Reason:** PLCard already has its own close button in header

### 3. Tab Counters Must Be Visible Immediately on Open
- **Files:** server/routes/pl.js, src/api/client.js, src/components/PLCard.jsx
- **Backend:** GET /api/pl/:id now returns _counts object with docs, comments, history counts
- **Frontend:** Uses server-provided counts immediately, falls back to lazy loading if needed
- **Constraint:** Still only one API call (GET /api/pl/:id) on cargo card open

### 4. History Must Be Sorted Newest to Oldest
- **File:** server/routes/pl.js
- **Fix:** Changed events sort from ASC to DESC (newest first)
- **Sort key:** createdAt

### 5. Calculator Must Use Only USD
- **File:** src/components/pl/PLCostSummary.jsx
- **Fix:** Removed currency selectors, currency now fixed to USD
- **UI:** Shows "USD" as static label instead of dropdown
- **Save:** All operations use USD as currency

### 6. Calculator Must Recalculate $/KG and $/M³ Immediately
- **Files:** src/components/pl/PLCostSummary.jsx, src/components/PLCard.jsx
- **Fix:** PLCard passes form values (weight_kg, volume_cbm) to calculator
- **Live updates:** Derived metrics update immediately on any input change
- **Edge cases:** Added safeDivide helper to prevent NaN/Infinity

## Testing

- [x] Build passes: npm run build
- [ ] Consolidation title click opens consolidation
- [ ] Only one close button visible in cargo card
- [ ] Tab counters visible immediately on cargo card open
- [ ] History sorted newest to oldest
- [ ] Calculator shows USD only
- [ ] Calculator recalculates immediately on weight/volume change

## Architecture Compliance

- ✓ Backend is single source of truth
- ✓ No N+1 API calls introduced
- ✓ Opening cargo card triggers only GET /api/pl/:id
- ✓ Counters included in existing payload
- ✓ No optimistic UI mutations without backend refresh
