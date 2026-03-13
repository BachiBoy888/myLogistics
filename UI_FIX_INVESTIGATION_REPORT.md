# UI and Calculation Issues Fix - Investigation Report

## Branch: fix/ui-calculation-issues
## Commit: 7642d9a

---

## 1. CONSOLIDATION TITLE MUST OPEN CONSOLIDATION

### Exact Failing Code Path
- **File:** `src/components/kanban/KanbanConsCard.jsx`
- **Lines:** 48-56 (header section)
- **Component:** `KanbanConsCard`

### Exact Root Cause
The consolidation title (span containing `cons.number`) was not clickable. Only the separate "Открыть консолидацию" div at the bottom had an onClick handler calling `onClick?.(cons)`.

### Intentional or Bug
**Bug** - The title should be a primary click target for opening the consolidation, matching user expectations from similar Kanban interfaces.

### Exact Code Fix
```jsx
// BEFORE: Title was in a non-clickable div
<div className="flex items-center gap-2">
  <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center">
    <Truck className="w-3.5 h-3.5 text-white" />
  </div>
  <span className="font-semibold text-sm text-blue-300">
    {cons.number?.replace(/-?\d{4}-?/, '-') || `CONS-${cons.id}`}
  </span>
</div>

// AFTER: Title wrapper is clickable with proper affordances
<div 
  className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
  onClick={(e) => {
    e.stopPropagation();
    onClick?.(cons);
  }}
  title="Открыть консолидацию"
>
  <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center">
    <Truck className="w-3.5 h-3.5 text-white" />
  </div>
  <span className="font-semibold text-sm text-blue-300 underline-offset-2 hover:underline">
    {cons.number?.replace(/-?\d{4}-?/, '-') || `CONS-${cons.id}`}
  </span>
</div>
```

### Updated Data Flow
1. User clicks consolidation title
2. `onClick?.(cons)` is called (same handler as "Открыть консолидацию")
3. Parent component (CargoView) opens consolidation modal
4. Drag-and-drop still works because `draggable` is on the parent card div

### Files Changed
- `src/components/kanban/KanbanConsCard.jsx`

---

## 2. DUPLICATE CLOSE BUTTON IN CARGO CARD

### Exact Failing Code Path
- **File:** `src/views/CargoView.jsx`
- **Lines:** 985-991 (Modal component)
- **Component:** `Modal` wrapper

### Exact Root Cause
The Modal component had its own close button (X icon), and PLCard also has a close button in its header. This resulted in two close buttons being visible.

### Intentional or Bug
**Bug** - Two close buttons is redundant and confusing UI.

### Exact Code Fix
```jsx
// BEFORE: Modal had its own close button
<div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden relative">
  <button
    onClick={onClose}
    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors z-10"
  >
    <X className="w-5 h-5" />
  </button>
  <div className="overflow-y-auto max-h-[90vh]">{children}</div>
</div>

// AFTER: Modal close button removed - PLCard has its own
<div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden relative">
  {/* Close button removed - PLCard has its own close button in header */}
  <div className="overflow-y-auto max-h-[90vh]">{children}</div>
</div>
```

### Updated Data Flow
1. Modal wrapper no longer has close button
2. PLCard's close button (line 414) is the single close control
3. Clicking it calls `handleClose()` which saves changes and calls `onClose()`

### Files Changed
- `src/views/CargoView.jsx`

---

## 3. TAB COUNTERS MUST BE VISIBLE IMMEDIATELY ON OPEN

### Exact Failing Code Path
- **Backend File:** `server/routes/pl.js` - GET /:id endpoint
- **Frontend Files:** 
  - `src/api/client.js` - `normalizePL` function
  - `src/components/PLCard.jsx` - `docsCount`, `commentsCount`, `getTabCount`

### Exact Root Cause
Counters were only loaded when tabs were opened (lazy loading via `listPLDocs`, `listPLComments`, `listPLEvents`). No counts were available in the initial PL payload.

### Intentional or Bug
**Bug** - Users expect to see counts immediately when opening a card, not after clicking each tab.

### Exact Code Fix

**Backend (server/routes/pl.js):**
```javascript
// Added to GET /:id endpoint - parallel count queries
const [docsCount, commentsCount, eventsCount] = await Promise.all([
  db.select({ count: sql`count(*)` }).from(plDocuments).where(eq(plDocuments.plId, plId)).then(r => Number(r[0]?.count || 0)),
  db.select({ count: sql`count(*)` }).from(plComments).where(eq(plComments.plId, plId)).then(r => Number(r[0]?.count || 0)),
  db.select({ count: sql`count(*)` }).from(plEvents).where(eq(plEvents.plId, plId)).then(r => Number(r[0]?.count || 0)),
]);

return { 
  ...(await hydrateResponsible(db, p)), 
  client: toClientShape(c),
  _counts: {
    docs: docsCount,
    comments: commentsCount,
    history: eventsCount,
  }
};
```

**Frontend API (src/api/client.js):**
```javascript
// Added to normalizePL return
_counts: s._counts ? {
  docs: Number(s._counts.docs) || 0,
  comments: Number(s._counts.comments) || 0,
  history: Number(s._counts.history) || 0,
} : undefined,
```

**Frontend Component (src/components/PLCard.jsx):**
```javascript
// Initialize with server counts if available
const [docsCount, setDocsCount] = useState(() => pl._counts?.docs ?? 0);
const [commentsCount, setCommentsCount] = useState(() => pl._counts?.comments ?? 0);

// Update when server data arrives
useEffect(() => {
  if (pl._counts) {
    setDocsCount(pl._counts.docs ?? 0);
    setCommentsCount(pl._counts.comments ?? 0);
  }
}, [pl._counts?.docs, pl._counts?.comments]);

// Use server count for history if events not loaded yet
const getTabCount = (tabId) => {
  switch (tabId) {
    case "docs": return docsCount;
    case "comments": return commentsCount;
    case "timeline":
      return eventsLoaded ? events.filter(Boolean).length : (pl._counts?.history ?? 0);
    default: return null;
  }
};
```

### Updated Data Flow
1. User opens cargo card
2. Single request: `GET /api/pl/:id`
3. Backend queries PL + counts in parallel (4 queries total)
4. Response includes `_counts: { docs, comments, history }`
5. Frontend normalizes and stores counts immediately
6. Tab counters visible before any tab is clicked
7. When tab opened, actual data loads and counts update if changed

### Files Changed
- `server/routes/pl.js` (added import, added counts to response)
- `src/api/client.js` (added _counts to normalizePL)
- `src/components/PLCard.jsx` (initialize counts from server)

---

## 4. HISTORY MUST BE SORTED FROM NEWEST TO OLDEST

### Exact Failing Code Path
- **File:** `server/routes/pl.js`
- **Line:** ~802 (events array sort)
- **Endpoint:** GET /:id/events

### Exact Root Cause
Events were sorted with `.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))` which sorts ascending (oldest first).

### Intentional or Bug
**Bug** - History should show newest events first, matching standard timeline UX patterns.

### Exact Code Fix
```javascript
// BEFORE: Oldest first (ASC)
.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

// AFTER: Newest first (DESC)
.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // NEWEST first (DESC)
```

### Updated Data Flow
1. Backend queries events from multiple sources
2. Events combined and sorted DESC (newest first)
3. Frontend displays events in received order
4. Newest event appears at top of history tab

### Files Changed
- `server/routes/pl.js`

---

## 5. CALCULATOR MUST USE ONLY USD

### Exact Failing Code Path
- **File:** `src/components/pl/PLCostSummary.jsx`
- **Lines:** 12-14 (CURRENCIES array), various lines with currency selectors

### Exact Root Cause
Calculator allowed currency selection via `<select>` dropdowns for Leg 1 and Leg 2. This added complexity without business justification.

### Intentional or Bug
**Intentional change** - Business requirement: all calculations in USD only.

### Exact Code Fix
```jsx
// BEFORE: Currency selector dropdown
<select
  value={leg1Currency}
  onChange={(e) => setLeg1Currency(e.target.value)}
  className="border rounded px-2 py-1 text-sm"
>
  <option value="USD">USD</option>
  <option value="CNY">CNY</option>
  <option value="KGS">KGS</option>
</select>

// AFTER: Static USD label
<span className="flex items-center px-2 py-1 text-sm font-medium text-gray-600 bg-gray-100 rounded">
  USD
</span>
```

Also removed:
- `leg1Currency`, `leg2Currency` state
- `setLeg1Currency`, `setLeg2Currency` functions
- Currency conversion logic
- USD equivalent display (≈ $XXX USD)

### Updated Data Flow
1. User enters leg cost values
2. Values are treated as USD (no conversion)
3. Save operation stores values with `currency: "USD"`
4. Derived metrics calculated directly from USD values

### Files Changed
- `src/components/pl/PLCostSummary.jsx`

---

## 6. CALCULATOR MUST RECALCULATE $/KG AND $/M³ IMMEDIATELY

### Exact Failing Code Path
- **File:** `src/components/pl/PLCostSummary.jsx`
- **Lines:** ~90-100 (derived metric calculations using `pl.weight_kg`, `pl.volume_cbm`)

### Exact Root Cause
Calculator used `pl.weight_kg` and `pl.volume_cbm` from props, which only update after server save. User typing in weight/volume fields didn't trigger immediate recalculation.

### Intentional or Bug
**Bug** - Derived metrics should update live as user types.

### Exact Code Fix

**PLCostSummary.jsx - Added safeDivide helper:**
```javascript
function safeDivide(numerator, denominator, decimals = 2) {
  const num = Number(numerator) || 0;
  const den = Number(denominator) || 0;
  if (den === 0 || !Number.isFinite(num) || !Number.isFinite(den)) {
    return "-";
  }
  const result = num / den;
  if (!Number.isFinite(result)) return "-";
  return formatMoney(result, decimals);
}
```

**PLCostSummary.jsx - Use effective weight/volume:**
```javascript
export default function PLCostSummary({ pl, onUpdate, weightKg, volumeCbm }) {
  // Use passed weight/volume if available (from form), otherwise fall back to PL values
  const effectiveWeight = weightKg !== undefined ? weightKg : (pl.weight_kg || 0);
  const effectiveVolume = volumeCbm !== undefined ? volumeCbm : (pl.volume_cbm || 0);
  
  // Calculate derived metrics with effective values
  const leg1UsdPerKg = safeDivide(leg1AmountUsd, effectiveWeight, 4);
  const leg1UsdPerM3 = safeDivide(leg1AmountUsd, effectiveVolume, 2);
  const leg2UsdPerKg = safeDivide(leg2AmountUsd, effectiveWeight, 4);
  const leg2UsdPerM3 = safeDivide(leg2AmountUsd, effectiveVolume, 2);
  
  // Display using safe values
  <div className="font-medium">${leg1UsdPerKg}</div>
```

**PLCard.jsx - Pass form values:**
```jsx
<PLCostSummary 
  pl={pl} 
  onUpdate={onUpdate} 
  weightKg={Number(formData.weight_kg) || 0}
  volumeCbm={Number(formData.volume_cbm) || 0}
/>
```

### Updated Data Flow
1. User types in weight field
2. `formData.weight_kg` updates immediately
3. `PLCostSummary` receives new `weightKg` prop
4. Derived metrics recalculate with new weight
5. Display updates instantly (no server round-trip)
6. On save, values persisted to backend

### Edge Cases Handled
- Weight = 0 or empty: shows "-"
- Volume = 0 or empty: shows "-"
- Never shows NaN
- Never shows Infinity

### Files Changed
- `src/components/pl/PLCostSummary.jsx`
- `src/components/PLCard.jsx`

---

## SUMMARY OF CHANGES

| Issue | Files Changed | Lines Changed | Root Cause |
|-------|--------------|---------------|------------|
| 1. Cons Title Click | KanbanConsCard.jsx | +8/-3 | Title not clickable |
| 2. Duplicate Close | CargoView.jsx | +2/-5 | Modal + PLCard both had close buttons |
| 3. Tab Counters | pl.js, client.js, PLCard.jsx | +35/-3 | Counters only loaded with tabs |
| 4. History Sort | pl.js | +1/-1 | Sorted ASC instead of DESC |
| 5. Calculator USD | PLCostSummary.jsx | ~70/-50 | Currency selectors present |
| 6. Live Recalc | PLCostSummary.jsx, PLCard.jsx | +20/-5 | Used stale PL props instead of form state |

**Total:** 6 files changed, 118 insertions(+), 88 deletions(-)

---

## VERIFICATION STEPS

### 1. Consolidation Title
1. Open Cargo view
2. Find consolidation card in Kanban
3. Click consolidation title (e.g., "CONS-20")
4. Expected: Consolidation modal opens
5. Expected: Drag-and-drop still works

### 2. Close Button
1. Open cargo card
2. Expected: Only ONE close button visible (top-right of card header)
3. Click close button
4. Expected: Card closes correctly

### 3. Tab Counters
1. Open cargo card
2. BEFORE clicking any tabs, check Documents/Comments/History counters
3. Expected: All counters visible with correct numbers
4. Check Network tab
5. Expected: Only ONE request to GET /api/pl/:id

### 4. History Sorting
1. Open cargo card
2. Click History tab
3. Expected: Newest event shown first (top)
4. Expected: Older events below

### 5. Calculator USD
1. Open cargo card with Info tab
2. Scroll to calculator
3. Expected: No currency dropdown/selectors visible
4. Expected: "USD" shown as static label

### 6. Calculator Live Recalculation
1. Open cargo card with calculator
2. Change weight value
3. Expected: $/kg values update immediately
4. Change volume value
5. Expected: $/m³ values update immediately
6. Enter 0 or clear weight/volume
7. Expected: Shows "-" (no NaN/Infinity)

---

## DEPLOYMENT NOTES

- Backend change requires server restart
- Database schema unchanged (counts calculated on-the-fly)
- No migration needed
- Backward compatible (old clients without _counts will still work)
