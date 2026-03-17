# 🔍 White Screen Investigation - Root Cause Analysis

## Problem Statement
- White screen in Render preview after deployment
- Browser console shows: `GET /assets/index-C5kjI3z9.js 404` and `GET /assets/index-Ol9-r6Ck.css 500`
- Note: The JS file hash in the error (`C5kjI3z9`) differs from current build (`Ck_OE2Gz`)

## Investigation Steps

### 1. ✅ Local Build Verification
```
dist/index.html references:
- /assets/index-Ck_OE2Gz.js
- /assets/index-Ol9-r6Ck.css

dist/assets/ contains:
- index-Ck_OE2Gz.js (780KB) ✅
- index-Ol9-r6Ck.css (46KB) ✅
- truck2-D6cWKU-7.png (111KB) ✅
```
**Result**: Build is correct locally. Filenames match.

### 2. ✅ Local Server Test
- `GET /` → 200 (text/html) ✅
- `GET /index.html` → 200 (text/html) ✅
- `GET /assets/index-Ck_OE2Gz.js` → 200 (application/javascript) ✅
- `GET /assets/index-Ol9-r6Ck.css` → 200 (text/css) ✅

**Result**: Server works correctly locally.

### 3. 🔍 Root Cause Identified

The error message shows a **different JS hash** than the current build:
- Error: `index-C5kjI3z9.js` (old hash)
- Actual: `index-Ck_OE2Gz.js` (current hash)

This means:
1. Browser has a **cached `index.html`** that references old assets
2. OR Render has an **old build** in the `dist` folder
3. OR There's a **CDN/proxy caching** the old index.html

The 500 error on CSS suggests the server was having issues serving files (likely due to `setHeaders` callback problems with path handling).

## Root Causes (Ranked by Confidence)

### #1: Cached index.html (High Confidence)
**Issue**: Browsers/CDNs cache `index.html` which contains hashed asset references. When a new build is deployed with new hashes, the cached HTML still references old hashes.

**Why this happens**:
- No cache-control headers on index.html
- Browsers cache aggressively
- Render might have edge caching

### #2: setHeaders Path Handling Bug (Medium Confidence)
**Issue**: Original code:
```javascript
setHeaders: (res, path) => {
  if (path.includes('/assets/')) {  // ❌ This is filesystem path, not URL
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
}
```

- `path` is the **full filesystem path** (`/root/.../dist/assets/file.js`)
- The check `path.includes('/assets/')` might fail on Windows or with certain path formats
- This caused inconsistent cache headers

### #3: Render Build Directory Mismatch (Low Confidence)
**Issue**: Render might build the frontend to a different directory than where the server expects it.

## Fixes Applied

### Fix #1: Explicit Asset Route with Error Handling
Added explicit `/assets/*` route that:
- Validates file exists before serving
- Returns 404 with details if file not found
- Sets correct Content-Type based on extension
- Sets immutable cache headers

```javascript
app.get("/assets/*", async (req, reply) => {
  const assetPath = req.params["*"];
  const fullPath = path.resolve(__dirname, "../dist/assets", assetPath);
  
  if (!fs.existsSync(fullPath)) {
    return reply.status(404).send({ 
      error: "Asset not found", 
      path: assetPath 
    });
  }
  // ... serve file with proper headers
});
```

### Fix #2: Improved setHeaders Callback
Fixed the cache header logic:
```javascript
setHeaders: (res, filepath) => {
  const isAsset = filepath.includes('/assets/') || filepath.includes('\\assets\\');
  if (isAsset) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (filepath.endsWith('index.html')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');  // HTTP/1.0
    res.setHeader('Expires', '0');        // Proxies
  }
}
```

### Fix #3: Diagnostic Endpoint
Added `GET /_debug/dist` to verify:
- Dist folder exists
- Asset files are present
- index.html content is correct

## Post-Deploy Verification

1. **Check diagnostic endpoint**:
   ```bash
   curl https://your-render-url/_debug/dist
   ```

2. **Verify asset files exist**:
   ```bash
   curl -I https://your-render-url/assets/index-Ck_OE2Gz.js
   # Should return 200 with immutable cache header
   ```

3. **Hard refresh browser**:
   - Windows: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`
   - Or clear browser cache completely

4. **Check index.html headers**:
   ```bash
   curl -I https://your-render-url/index.html
   # Should show: cache-control: no-cache, no-store, must-revalidate
   ```

## Prevention Measures

1. **Never cache index.html** - Always use `no-cache` headers
2. **Use hashed asset filenames** - Vite does this automatically
3. **Add diagnostic endpoints** - For quick debugging in production
4. **Version your builds** - Include build timestamp in index.html comment
5. **Consider service worker** - For more control over caching (advanced)

## Files Changed
- `server/server.js` - Asset serving, cache headers, diagnostic endpoint

## Commits
- `4498402` - fix: add explicit asset serving and diagnostic endpoints
