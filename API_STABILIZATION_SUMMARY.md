# 🔧 Public API Stabilization & Landing Removal - Summary

## Changes Made

### 1. CORS Security (server/server.js)
- **Before**: Open CORS allowing all origins (`origin: (origin, cb) => cb(null, true)`)
- **After**: Environment-based allowlist with `ALLOWED_ORIGINS` env variable
- **Fallback origins** for development:
  - http://localhost:5173
  - http://localhost:3000
  - http://127.0.0.1:5173
  - http://127.0.0.1:3000

### 2. Rate Limiting (server/routes/leads.js)
Installed `@fastify/rate-limit` and configured:

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /api/public/calculate | 30 req/min | Env: `RATE_LIMIT_CALCULATE_MAX` |
| POST /api/leads | 5 req/min | Env: `RATE_LIMIT_LEADS_MAX` |

Rate limit response (429):
```json
{
  "statusCode": 429,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Try again in 59s",
  "retryAfter": "59s"
}
```

### 3. Source Tagging (server/routes/leads.js)
- Accepts source from `X-Source` header OR `?source=` query param
- Validates against allowed list: `["website_calculator", "prolife_site", "external_site"]`
- Fallback to `"website_calculator"` for backward compatibility
- Stores source in database

### 4. Honeypot Protection (server/routes/leads.js)
- Accepts optional `"website"` field in request body
- If filled (bots typically fill hidden fields), request is silently rejected
- Returns fake success response to not alert the bot
- Logs honeypot trigger for monitoring

### 5. Landing Removal
- Deleted entire `/landing` folder
- Removed landing-related code from `src/App.jsx`:
  - Removed `LandingHomePage` import
  - Removed `isLanding` path check
  - Removed landing route handling

---

## Environment Configuration

Add these variables to your `.env` file:

```bash
# CORS Configuration (comma-separated list of allowed origins)
# Example: ALLOWED_ORIGINS=https://example.com,https://app.example.com
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Rate Limiting Configuration
RATE_LIMIT_CALCULATE_MAX=30
RATE_LIMIT_LEADS_MAX=5
```

---

## Testing with curl

### 1. Test Calculator (Success)
```bash
curl -X POST http://localhost:3000/api/public/calculate \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" \
  -d '{
    "weight": 100,
    "volume": 0.5,
    "deliveryType": "road",
    "originCity": "guangzhou"
  }'
```

### 2. Test Calculator (CORS Blocked)
```bash
curl -X POST http://localhost:3000/api/public/calculate \
  -H "Content-Type: application/json" \
  -H "Origin: https://evil.com" \
  -d '{
    "weight": 100,
    "volume": 0.5,
    "deliveryType": "road"
  }'
# Expected: CORS error
```

### 3. Test Lead Creation with Source Header
```bash
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" \
  -H "X-Source: external_site" \
  -d '{
    "name": "Test User",
    "phone": "+996990111111",
    "weight": 100,
    "volume": 0.5,
    "deliveryType": "road",
    "originCity": "guangzhou"
  }'
```

### 4. Test Lead Creation with Source Query Param
```bash
curl -X POST "http://localhost:3000/api/leads?source=prolife_site" \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" \
  -d '{
    "name": "Test User",
    "phone": "+996990111111",
    "weight": 100,
    "volume": 0.5,
    "deliveryType": "road"
  }'
```

### 5. Test Honeypot (Should be silently rejected)
```bash
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" \
  -d '{
    "name": "Bot User",
    "phone": "+996990111111",
    "weight": 100,
    "volume": 0.5,
    "deliveryType": "road",
    "website": "filled-by-bot.com"
  }'
# Expected: {"success": false, "leadId": null, "message": "..."}
```

### 6. Test Rate Limiting (Run 6+ times quickly)
```bash
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/leads \
    -H "Content-Type: application/json" \
    -H "Origin: http://localhost:5173" \
    -d '{
      "name": "Test User",
      "phone": "+996990111111",
      "weight": 100,
      "volume": 0.5,
      "deliveryType": "road"
    }'
  echo ""
done
# Expected: 429 error on 6th request
```

---

## Files Modified

| File | Changes |
|------|---------|
| `server/server.js` | Added `@fastify/rate-limit` import, updated CORS config, registered rate limit plugin |
| `server/routes/leads.js` | Added rate limiting, source tagging, honeypot protection |
| `server/.env.local` | Added new environment variables |
| `server/package.json` | Added `@fastify/rate-limit` dependency |
| `src/App.jsx` | Removed landing-related code |
| `landing/` | **DELETED** - entire folder removed |

---

## Backward Compatibility

✅ All existing functionality preserved:
- CRM works exactly as before
- Internal calculator calls work without modification
- Default source is `"website_calculator"` for existing requests
- No breaking changes to API response format

---

## Deployment Checklist

- [ ] Set `ALLOWED_ORIGINS` env variable on Render
- [ ] Set `RATE_LIMIT_CALCULATE_MAX` (default: 30)
- [ ] Set `RATE_LIMIT_LEADS_MAX` (default: 5)
- [ ] Deploy backend
- [ ] Verify external site can connect
- [ ] Test lead appears in CRM with correct source
- [ ] Verify CRM functionality unchanged
