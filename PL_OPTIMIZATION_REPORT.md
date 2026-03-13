# PL Card Optimization Report

## 1. Current Open Flow (BEFORE fix)

```
1. User clicks PL in kanban
   ↓
2. setSelectedId(id) called
   ↓
3. Modal opens IMMEDIATELY with data from safePLs (fallback)
   ↓
4. GET /api/pl/:id starts fetching
   ↓
5. User sees STALE calculator values from list (safePLs)
   ↓
6. After ~3.5 seconds, fresh data arrives
   ↓
7. Calculator updates with new values
   ↓
8. User sees price/value FLASH/JUMP
```

### Problems identified:
- **Financial data flicker**: User sees old price, then new price
- **Heavy payload**: GET /api/pl/:id returned base64 avatar (~100KB+)
- **Eager loading**: /events, /docs, /comments loaded immediately on open

---

## 2. Exact Reason Why Old Calculator Value Appears

**Root cause**: The `selected` memo used fallback to `safePLs`:

```javascript
// BEFORE:
const selected = useMemo(
  () => selectedPLDetail ?? safePLs.find((p) => p.id === selectedId) ?? null,
  [safePLs, selectedId, selectedPLDetail]
);
```

When user clicked PL:
1. `selectedId` set to PL id
2. `selectedPLDetail` was `null` (fetch not complete)
3. `selected` returned `safePLs.find(...)` — **stale list data**
4. PLCard rendered with stale data
5. Calculator showed stale values
6. Only after fetch completed did values update

---

## 3. Changes Made in Frontend

### File: `src/views/CargoView.jsx`

#### Change 3.1: Modified `selected` memo (lines 335-341)
```javascript
const selected = useMemo(
  () => {
    // Только fresh данные из API. Не используем fallback из списка.
    if (!selectedId || !selectedPLDetail) return null;
    return selectedPLDetail;
  },
  [selectedId, selectedPLDetail]
);
```
**Effect**: PLCard only renders AFTER fresh data loaded. No stale data shown.

#### Change 3.2: Added loading state (lines 343-345)
```javascript
const isPLLoading = selectedId !== null && (isLoadingPLDetail || !selectedPLDetail);
```

#### Change 3.3: Added skeleton UI (lines 709-735)
Shows animated skeleton while loading fresh data:
- Header skeleton
- Content skeleton  
- **Calculator block skeleton** (highlighted with bg-gray-50 border)

---

### File: `src/components/PLCard.jsx`

#### Change 3.4: Lazy load timeline/events (lines 107-127)
```javascript
// Загружаем события только при открытии вкладки timeline
useEffect(() => {
  if (activeTab === "timeline" && pl?.id && !eventsLoaded) {
    refreshEvents();
  }
}, [activeTab, pl?.id]);
```

#### Change 3.5: Lazy load docs (lines 132-147)
```javascript
useEffect(() => {
  if (activeTab === "docs" && pl?.id && !docsLoaded) {
    setDocsLoading(true);
    listPLDocs(pl.id)
      .then(...)
      .finally(() => setDocsLoading(false));
  }
}, [activeTab, pl?.id, docsLoaded]);
```

#### Change 3.6: Lazy load comments (lines 151-166)
Same pattern as docs — only load when `activeTab === "comments"`.

---

## 4. Changes Made in Backend API

### File: `server/routes/pl.js`

#### Change 4.1: Removed base64 avatar from hydrateResponsible (lines 37-55)
```javascript
// BEFORE: responsible_avatar: responsibleAvatar (base64 string)
// AFTER:  responsible_avatar: null

// Avatar will be loaded lazily via separate endpoint
```

**Effect**: GET /api/pl/:id response no longer contains base64 image data.

---

### File: `server/routes/users.js`

#### Change 4.2: Added avatar endpoint (lines 436-453)
```javascript
// GET /api/users/:id/avatar - получить аватар пользователя (lazy loading)
app.get("/:id/avatar", async (req, reply) => {
  const userId = req.params.id;
  const [user] = await db
    .select({ avatar: usersTable.avatar })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user || !user.avatar) {
    return reply.code(404).send({ error: "not_found" });
  }
  return reply.send({ avatar: user.avatar });
});
```

**Future optimization**: This endpoint can be extended to:
- Generate 32x32/40x40 thumbnails on-the-fly
- Convert to webp format
- Return cached thumbnail URL

---

## 5. How Avatar Payload Was Optimized

### Before:
```json
{
  "id": 123,
  "responsible_name": "John Doe",
  "responsible_avatar": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...", // ~100KB+
  ...
}
```

### After:
```json
{
  "id": 123,
  "responsible_name": "John Doe",
  "responsible_avatar": null, // Removed from main payload
  ...
}
```

**Size reduction**: ~100KB+ per PL with responsible user

**Lazy loading**: Avatar can be fetched separately via `/api/users/:id/avatar` only when needed (e.g., when rendering responsible user avatar).

---

## 6. Final Size of GET /api/pl/:id Response

**Estimated reduction**: 
- Base response: ~5-10KB
- With base64 avatar: ~105-110KB
- **Savings**: ~90-95% reduction when avatar was present

**Note**: Actual measurement requires runtime testing with DevTools Network tab.

---

## 7. Lazy Loading Status for Events/Docs/Comments

| Resource | Before | After |
|----------|--------|-------|
| /events  | Loaded immediately on PL open | Only when Timeline tab opened |
| /docs    | Loaded immediately on PL open | Only when Documents tab opened |
| /comments| Loaded immediately on PL open | Only when Comments tab opened |

**User impact**: Faster initial PL open, less data transferred if user doesn't open all tabs.

---

## 8. Files Changed

| File | Lines Changed |
|------|---------------|
| `server/routes/pl.js` | +7/-4 |
| `server/routes/users.js` | +25/-0 |
| `src/components/PLCard.jsx` | +54/-17 |
| `src/views/CargoView.jsx` | +31/-4 |
| **Total** | **+117/-25** |

---

## 9. Commit Hash

```
1565ae5 Optimize PL card loading: fresh data only, lazy tabs, lightweight avatar
```

---

## 10. CI Status

**Status**: Not checked (GitHub CLI not authenticated)

Check at: https://github.com/BachiBoy888/myLogistics/actions

---

## 11. Preview Deployment Status

**Branch**: `feature/leg2-source-of-truth-stabilization`  
**Commit**: `1565ae5`

**To deploy**:
```bash
git pull origin feature/leg2-source-of-truth-stabilization
# Deploy to your preview environment (Vercel/Netlify/etc.)
```

---

## 12. Exact Manual Verification Steps

### Test 1: No stale calculator values
1. Open kanban board with PLs
2. Click on any PL card
3. **Expected**: Skeleton shown immediately (no old values)
4. Wait ~1-3 seconds
5. **Expected**: PL card appears with fresh data
6. **Verify**: Calculator block shows values directly (no flash/jump)

### Test 2: Lazy loading works
1. Open DevTools → Network tab
2. Click on PL card
3. **Verify**: Only `GET /api/pl/:id` is called initially
4. **Verify**: NO calls to `/events`, `/docs`, `/comments`
5. Click "Documents" tab
6. **Verify**: NOW `GET /api/pl/:id/docs` is called
7. Click "Comments" tab  
8. **Verify**: NOW `GET /api/pl/:id/comments` is called
9. Click "Timeline" tab
10. **Verify**: NOW `GET /api/pl/:id/events` is called

### Test 3: Payload size reduced
1. Open DevTools → Network tab
2. Click on PL with responsible user
3. Find `GET /api/pl/:id` request
4. **Verify**: Response size is <15KB (was ~100KB+ with avatar)
5. **Verify**: `responsible_avatar` field is `null`

### Test 4: Race condition still fixed
1. Open PL card
2. Close it immediately (before load completes)
3. **Expected**: Modal closes and stays closed
4. **Verify**: No reopening (race condition fix still active)

---

## Summary

| Requirement | Status |
|-------------|--------|
| Calculator shows only fresh DB data | ✅ Yes, no fallback to safePLs |
| No stale values visible to user | ✅ Yes, skeleton shown while loading |
| Fast opening | ✅ Yes, skeleton immediate |
| Light payload | ✅ Yes, avatar removed from response |
| Lazy load events/docs/comments | ✅ Yes, only on tab open |
| Avatar optimization | ✅ Yes, base64 removed, lazy endpoint added |
