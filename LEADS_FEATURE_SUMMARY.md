# Lead Generation Feature - Implementation Summary

## Branch
`fix/bill-tab-architecture`

## Pull Request
https://github.com/BachiBoy888/myLogistics/pull/new/fix/bill-tab-architecture

---

## Summary

Implemented the first production-ready version of a public lead-generation website flow for myLogistics. This feature enables a complete funnel from public calculator to lead capture to conversion into the existing PL workflow.

## Business Flow
```
Public visitor → /calculate → enter shipment params → get estimate → submit lead 
→ internal leads list → lead details → convert to PL → normal PL workflow
```

---

## Changes Overview

### 1. Database (server/db/schema.js)
- **New table**: `leads` with 23 columns
- **Fields**:
  - Contact info: `name`, `phone`, `company`, `email`, `note`
  - Cargo params: `cargoName`, `weight`, `volume`, `originCity`, `destinationCity`, `deliveryType`
  - Estimate: `estimatedPrice`, `estimatedCurrency`, `estimatedDaysMin`, `estimatedDaysMax`, `calculatorSnapshot`
  - Operational: `managerId`, `clientId`, `convertedPlId`, `source`, `status`
- **Indexes**: status, createdAt, manager, client, convertedPl
- **Enum**: `lead_status` (new, contacted, qualified, converted, lost)

### 2. Migration (server/drizzle/0031_add_leads_table.sql)
- Creates `lead_status` enum type
- Creates `leads` table with all columns
- Adds 5 indexes for query optimization
- Adds trigger for auto-updating `updated_at`

### 3. Migration Journal (server/drizzle/meta/_journal.json)
- Registered migration 0031_add_leads_table

### 4. Backend Routes (server/routes/leads.js)
**Public endpoints** (no auth):
- `POST /api/public/calculate` - Calculate shipping estimate
- `POST /api/leads` - Submit new lead

**Authenticated endpoints**:
- `GET /api/leads` - List leads (with optional status filter)
- `GET /api/leads/:id` - Get single lead with relations
- `PATCH /api/leads/:id` - Update lead status/fields
- `POST /api/leads/:id/convert-to-pl` - Convert lead to PL
- `DELETE /api/leads/:id` - Delete lead (not allowed if converted)

**Conversion logic**:
- Finds or creates client from lead data
- Creates new PL with lead parameters
- Updates lead with `status=converted`, `clientId`, `convertedPlId`

### 5. Server Integration (server/server.js)
- Imported and registered leads routes under `/api` prefix

### 6. Frontend API (src/api/client.js)
Added functions:
- `calculateShippingEstimate()` - Public calculation
- `submitLead()` - Public lead submission
- `listLeads()` - Get leads list
- `getLead()` - Get single lead
- `updateLead()` - Update lead
- `convertLeadToPL()` - Convert to PL
- `deleteLead()` - Delete lead

### 7. Public Calculator Page (src/views/PublicCalculatorPage.jsx)
**Route**: `/calculate` or `/estimate`

**Features**:
- Clean, mobile-friendly UI
- Step 1: Enter cargo params (name, weight, volume, cities, delivery type)
- Step 2: Show estimate (price + delivery days)
- Step 3: Lead capture form (name, phone, company, email, note)
- Step 4: Success confirmation

**Delivery types**: Auto (road), Avia (air), Express

### 8. Internal Leads View (src/views/LeadsView.jsx)
**Route**: Internal tab "Лиды"

**Features**:
- Stats cards by status
- Filter by status
- Table view with: date, client, contacts, params, estimate, status
- Detail modal with full lead info
- Status change buttons
- Convert to PL button
- Link to converted PL
- Delete lead (with protection for converted)

### 9. Navigation (src/components/layout/Header.jsx)
- Added "Лиды" tab with Target icon

### 10. App Integration (src/App.jsx)
- Added route handling for `/calculate` and `/estimate`
- Added `LeadsView` rendering for `mode === "leads"`
- Added `PublicCalculatorPage` component

---

## Estimation Formula (MVP)

```javascript
const baseRates = {
  air:    { perKg: 8.5,  perCbm: 1200, baseDays: 5,  varianceDays: 3 },
  road:   { perKg: 2.5,  perCbm: 350,  baseDays: 12, varianceDays: 5 },
  express:{ perKg: 12.0, perCbm: 1800, baseDays: 3,  varianceDays: 2 },
};

// Max of weight-based or volume-based cost, minimum $50
estimatedPrice = Math.max(weight * rate.perKg, volume * rate.perCbm, 50);
```

This is intentionally simple for MVP. Future tuning can be done in `calculateEstimate()` function in `server/routes/leads.js`.

---

## Testing Instructions

### Public Flow
1. Open `/calculate` (no login required)
2. Enter weight (e.g., 100 kg)
3. Enter volume (e.g., 1.5 m³)
4. Select delivery type (e.g., Auto)
5. Click "Рассчитать стоимость"
6. Verify estimate shows price and days
7. Click "Получить точный расчёт"
8. Fill name and phone
9. Submit
10. Verify success message

### Database Verification
```sql
SELECT * FROM leads ORDER BY created_at DESC LIMIT 1;
```

### Internal Flow
1. Login to app
2. Click "Лиды" tab
3. Verify new lead appears in list
4. Click lead row
5. Verify detail modal opens with correct data
6. Change status (e.g., new → contacted)
7. Click "Конвертировать в PL"
8. Verify PL created and linked
9. Click "Открыть PL" to navigate to PL

### Regression Testing
- Existing Cargo page opens
- Existing Clients page opens
- Existing Consolidations work
- No console errors

---

## Security Considerations

1. **Public endpoints** only allow: calculation and lead submission
2. **All management endpoints** require authentication
3. **Lead deletion** blocked if already converted
4. **Conversion** is idempotent (prevents double-conversion)
5. **Phone-based client matching** to prevent duplicate clients

---

## Architecture Compliance

✅ Backend is single source of truth
✅ Frontend has no hidden business logic
✅ All validation in backend
✅ Calculation logic in backend only
✅ Conversion logic in backend only
✅ Proper Drizzle migration lifecycle
✅ Migration registered in journal
✅ No breaking changes to existing flows
✅ No frontend workarounds

---

## Known Risks / Limitations

1. **Estimation formula is MVP-simple** - Not accounting for:
   - Real-time rates
   - Seasonal adjustments
   - Special cargo types
   - Fuel surcharges

2. **No duplicate lead prevention** - Same person can submit multiple leads

3. **No email/notification system** - Leads just appear in the list

4. **No lead assignment automation** - All new leads have `managerId=null`

5. **Basic client matching** - Only by phone number

6. **No UTM/analytics tracking** - Source is always "website_calculator"

---

## Future Enhancements (Out of Scope)

- Advanced quoting engine with real rates
- Lead deduplication
- Email notifications
- Auto-assignment rules
- UTM tracking
- Lead scoring
- WhatsApp/Telegram integration
- Bulk operations
- CRM dashboards

---

## Checklist

- [x] Database schema created
- [x] Migration file created
- [x] Migration registered in journal
- [x] Backend routes implemented
- [x] Frontend API layer added
- [x] Public calculator page created
- [x] Internal leads view created
- [x] Navigation updated
- [x] Build passes
- [x] Server starts without errors
- [x] No breaking changes to existing functionality
- [x] PR created and pushed
