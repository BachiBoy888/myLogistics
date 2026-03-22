# UTM Tracking Implementation Report

**Date:** 2026-03-22  
**Task:** Add UTM data support to MyLogistics backend for leads

---

## Summary

Backend successfully updated to accept, store, and return UTM data for leads.

---

## Changes Made

### 1. Database Migration

**File:** `server/drizzle/0033_add_lead_utm_fields.sql`

```sql
-- Added columns:
- lead_entry_point (TEXT, nullable)
- utm_source (TEXT, nullable)
- utm_medium (TEXT, nullable)
- utm_campaign (TEXT, nullable)
- utm_content (TEXT, nullable)

-- Added indexes:
- idx_leads_lead_entry_point
- idx_leads_utm_source
```

### 2. Schema Update

**File:** `server/db/schema.js`

Added to `leads` table definition:
```javascript
leadEntryPoint: text("lead_entry_point"), // 'calculator' | 'contact_form' | 'lab_calculator'
utmSource: text("utm_source"),
utmMedium: text("utm_medium"),
utmCampaign: text("utm_campaign"),
utmContent: text("utm_content"),
```

Also added indexes for new fields.

### 3. API Update

**File:** `server/routes/leads.js`

#### Updated POST /api/leads

**New request body schema (optional fields):**
```javascript
{
  // ... existing required fields (name, phone, weight, volume, deliveryType) ...
  
  // Source (optional, validated)
  source: "website_calculator" | "prolife_site" | "external_site",
  
  // Entry point (optional, validated)
  leadEntryPoint: "calculator" | "contact_form" | "lab_calculator",
  
  // UTM fields (all optional, nullable strings)
  utmSource: string | null,
  utmMedium: string | null,
  utmCampaign: string | null,
  utmContent: string | null
}
```

**Source priority logic:**
1. `source` from request body (if valid)
2. `X-Source` header (if valid)
3. `source` query parameter (if valid)
4. Fallback: `"website_calculator"`

#### GET endpoints (no changes needed)

Both `GET /api/leads` and `GET /api/leads/:id` automatically return all new fields via spread operator.

---

## Example Usage

### Create Lead with UTM Data

```bash
POST /api/leads
Content-Type: application/json

{
  "name": "Иван Иванов",
  "phone": "+996555123456",
  "weight": 100,
  "volume": 1.5,
  "deliveryType": "air",
  
  // New fields
  "source": "prolife_site",
  "leadEntryPoint": "calculator",
  "utmSource": "google",
  "utmMedium": "cpc",
  "utmCampaign": "spring_sale_2026",
  "utmContent": "banner_top"
}
```

### Response (201 Created)

```json
{
  "success": true,
  "leadId": 123,
  "message": "Заявка принята. Мы свяжемся с вами."
}
```

### Get Lead (with UTM fields)

```bash
GET /api/leads/123
Authorization: Bearer <token>
```

### Response

```json
{
  "id": 123,
  "name": "Иван Иванов",
  "phone": "+996555123456",
  "source": "prolife_site",
  "leadEntryPoint": "calculator",
  "utmSource": "google",
  "utmMedium": "cpc",
  "utmCampaign": "spring_sale_2026",
  "utmContent": "banner_top",
  "status": "new",
  "createdAt": "2026-03-22T10:30:00.000Z",
  // ... other fields ...
  "manager": null,
  "client": null,
  "convertedPl": null
}
```

---

## Database Schema (after migration)

```sql
CREATE TABLE leads (
  id SERIAL PRIMARY KEY,
  -- ... existing fields ...
  source TEXT NOT NULL DEFAULT 'website_calculator',
  lead_entry_point TEXT,           -- NEW
  utm_source TEXT,                  -- NEW
  utm_medium TEXT,                  -- NEW
  utm_campaign TEXT,                -- NEW
  utm_content TEXT,                 -- NEW
  -- ... rest of fields ...
);

-- Indexes
CREATE INDEX idx_leads_lead_entry_point ON leads(lead_entry_point);
CREATE INDEX idx_leads_utm_source ON leads(utm_source);
```

---

## Backward Compatibility

✅ **Fully backward compatible:**
- All new fields are optional/nullable
- Old leads without UTM data continue to work
- `source` field behavior preserved (fallback to legacy logic if not provided in body)
- API accepts requests without new fields

---

## CRM/UI Integration Points

The following fields are now available in lead responses for CRM/Admin UI:

| Field | Type | Description |
|-------|------|-------------|
| `source` | string | System source: `website_calculator`, `prolife_site`, `external_site` |
| `leadEntryPoint` | string | Entry point: `calculator`, `contact_form`, `lab_calculator` |
| `utmSource` | string | UTM source (e.g., "google", "facebook") |
| `utmMedium` | string | UTM medium (e.g., "cpc", "organic", "email") |
| `utmCampaign` | string | UTM campaign name |
| `utmContent` | string | UTM content/ad variant |

---

## Files Modified

1. `server/drizzle/0033_add_lead_utm_fields.sql` - New migration
2. `server/db/schema.js` - Updated leads table schema
3. `server/routes/leads.js` - Updated POST /api/leads endpoint

---

## Next Steps for Frontend Integration

External site can now send UTM data when creating leads:

```javascript
fetch('/api/leads', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: userData.name,
    phone: userData.phone,
    weight: cargo.weight,
    volume: cargo.volume,
    deliveryType: 'air',
    // UTM data
    source: 'prolife_site',
    leadEntryPoint: 'calculator',
    utmSource: urlParams.get('utm_source'),
    utmMedium: urlParams.get('utm_medium'),
    utmCampaign: urlParams.get('utm_campaign'),
    utmContent: urlParams.get('utm_content'),
  })
});
```

CRM/Admin UI can display these fields in the leads table using existing API endpoints.
