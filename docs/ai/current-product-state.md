# Current Product State — myLogistics

**Document version:** 2.0  
**Date:** March 7, 2026  
**Branch:** analysis/current-product-state

---

## 1. Database Schema

### 1.1. clients
**Found in:** `server/db/schema.js`

```javascript
{
  id: serial,
  name: text (not null),
  phone: text,
  phone2: text,
  email: text,
  notes: text,
  company: text,
  normalizedName: text,
  createdAt: timestamp
}
```

**Indexes:** none

---

### 1.2. pl (Packing Lists)
**Found in:** `server/db/schema.js`

```javascript
{
  id: serial,
  plNumber: text,
  clientId: integer (not null, foreign key),
  name: text (not null),
  weight: numeric(12,3),
  volume: numeric(12,3),
  places: integer (default 1),
  incoterm: text,
  pickupAddress: text,
  shipperName: text,
  shipperContacts: text,
  status: text (default 'draft'),
  clientPrice: numeric(12,2) (default 0),
  calculator: jsonb (default '{}'),
  leg1Amount: numeric(15,2) (default 0),
  leg1Currency: text (default 'USD'),
  leg1AmountUsd: numeric(15,2) (default 0),
  leg1UsdPerKg: numeric(15,4) (default 0),
  leg1UsdPerM3: numeric(15,4) (default 0),
  leg2Amount: numeric(15,2) (default 0),
  leg2Currency: text (default 'USD'),
  leg2AmountUsd: numeric(15,2) (default 0),
  leg2UsdPerKg: numeric(15,4) (default 0),
  leg2UsdPerM3: numeric(15,4) (default 0),
  fxSource: text,
  fxDate: text,
  fxUsdKgs: numeric(10,4),
  fxCnyKgs: numeric(10,4),
  fxSavedAt: timestamp,
  responsibleUserId: uuid (foreign key),
  createdAt: timestamp
}
```

**Indexes:** plNumberIdx, plNumberUq, responsibleIdx, fxDateIdx

---

### 1.3. plDocuments
**Found in:** `server/db/schema.js`

```javascript
{
  id: uuid,
  plId: integer (not null, foreign key),
  docType: text (not null),
  name: text,
  fileName: text (not null),
  mimeType: text,
  sizeBytes: bigint,
  storagePath: text (not null),
  status: text (default 'pending'),
  note: text,
  uploadedBy: text,
  uploadedAt: timestamp,
  updatedAt: timestamp
}
```

**Indexes:** byPlId, byType, byStatus, uqDocPerType

---

### 1.4. plDocStatusHistory
**Found in:** `server/db/schema.js`

```javascript
{
  id: uuid,
  docId: uuid (not null, foreign key),
  oldStatus: text,
  newStatus: text (not null),
  note: text,
  changedBy: text,
  changedAt: timestamp
}
```

---

### 1.5. plComments
**Found in:** `server/db/schema.js`

```javascript
{
  id: uuid,
  plId: integer (not null, foreign key),
  userId: uuid (foreign key),
  author: text (default 'Логист'),
  body: text (not null),
  createdAt: timestamp
}
```

**Indexes:** byPl, byPlCreated

---

### 1.6. plEvents
**Found in:** `server/db/schema.js`

```javascript
{
  id: uuid,
  plId: integer (not null, foreign key),
  type: text (not null),
  message: text (not null),
  meta: jsonb (default '{}'),
  actorUserId: uuid (foreign key),
  createdAt: timestamp
}
```

**Indexes:** byPl, byPlCreated, byActor

---

### 1.7. consolidations
**Found in:** `server/db/schema.js`

```javascript
{
  id: uuid,
  consNumber: text (not null),
  title: text,
  status: consolidation_status_v2 enum (default 'loaded'),
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**Enum values:** to_load, loaded, to_customs, released, kg_customs, collect_payment, delivered, closed

**Indexes:** consNumberIdx, consNumberUq, statusIdx

---

### 1.8. consolidationPl
**Found in:** `server/db/schema.js`

```javascript
{
  consolidationId: uuid (not null, foreign key),
  plId: integer (not null, foreign key),
  addedAt: timestamp
}
```

**Indexes:** pk, byPl, byCons

---

### 1.9. consolidationStatusHistory
**Found in:** `server/db/schema.js`

```javascript
{
  id: uuid,
  consolidationId: uuid (not null, foreign key),
  fromStatus: consolidation_status_v2 enum,
  toStatus: consolidation_status_v2 enum (not null),
  note: text,
  changedBy: text,
  createdAt: timestamp
}
```

**Indexes:** byCons, byToStatus

---

### 1.10. users
**Found in:** `server/db/schema.js`

```javascript
{
  id: uuid,
  login: text (not null),
  passwordHash: text (not null),
  name: text (not null),
  phone: text,
  email: text,
  role: text (default 'user'),
  createdAt: timestamp
}
```

**Indexes:** uqLogin

**Roles:** admin, logist, user

---

### 1.11. analyticsDailySnapshots
**Found in:** `server/db/schema.js`

```javascript
{
  day: timestamp (not null),
  generatedAt: timestamp,
  sourceTs: timestamp,
  totalClients: integer (default 0),
  inquiryClients: integer (default 0),
  activeClients: integer (default 0)
}
```

**Indexes:** pk, byDay

---

### 1.12. analyticsDailyPlStatus
**Found in:** `server/db/schema.js`

```javascript
{
  day: timestamp (not null),
  status: text (not null),
  plCount: integer (default 0)
}
```

**Indexes:** pk, byDay, byStatus

---

### 1.13. analyticsDailyWeightStatus
**Found in:** `server/db/schema.js`

```javascript
{
  day: timestamp (not null),
  status: text (not null),
  totalWeight: numeric(15,3) (default 0)
}
```

**Indexes:** pk, byDay, byStatus

---

## 2. API Routes

### 2.1. Auth Routes
**Found in:** `server/routes/auth.js`

| Method | Path | Handler |
|--------|------|---------|
| POST | /api/auth/login | Login |
| POST | /api/auth/logout | Logout |
| GET | /api/auth/me | Current user |

---

### 2.2. Users Routes
**Found in:** `server/routes/users.js`

| Method | Path | Handler |
|--------|------|---------|
| GET | /api/users | List users (with role filter) |

---

### 2.3. Clients Routes
**Found in:** `server/routes/clients.js`

| Method | Path | Handler |
|--------|------|---------|
| GET | /api/clients | List all clients |
| GET | /api/clients/search | Search clients |
| POST | /api/clients | Create client |
| PATCH | /api/clients/:id | Update client |
| DELETE | /api/clients/:id | Delete client (only if no PLs) |

---

### 2.4. PL Routes
**Found in:** `server/routes/pl.js`

| Method | Path | Handler |
|--------|------|---------|
| GET | /api/pl | List all PLs |
| GET | /api/pl/:id | Get single PL |
| POST | /api/pl | Create PL |
| PUT | /api/pl/:id | Update PL |
| DELETE | /api/pl/:id | Delete PL |
| PUT | /api/pl/:id/responsible | Assign responsible |
| GET | /api/pl/:id/events | List events |
| GET | /api/pl/:id/docs | List documents |
| POST | /api/pl/:id/docs | Upload document |
| GET | /api/pl/:id/docs/:docId | Download document |
| PATCH | /api/pl/:id/docs/:docId | Update document |
| DELETE | /api/pl/:id/docs/:docId | Delete document |
| GET | /api/pl/:id/docs/:docId/history | Document status history |
| GET | /api/pl/:id/comments | List comments |
| POST | /api/pl/:id/comments | Add comment |
| DELETE | /api/pl/:id/comments/:commentId | Delete comment |

---

### 2.5. Consolidations Routes
**Found in:** `server/routes/consolidations.js`

| Method | Path | Handler |
|--------|------|---------|
| GET | /api/consolidations | List consolidations |
| GET | /api/consolidations/:id | Get single consolidation |
| POST | /api/consolidations | Create consolidation |
| PATCH | /api/consolidations/:id | Update consolidation |
| DELETE | /api/consolidations/:id | Delete consolidation |
| POST | /api/consolidations/:id/pl | Add PL to consolidation |
| DELETE | /api/consolidations/:id/pl/:plId | Remove PL from consolidation |
| PUT | /api/consolidations/:id/pl | Set PL list |
| GET | /api/consolidations/:id/status-history | Status history |

---

### 2.6. Analytics Routes
**Found in:** `server/routes/analytics.js`

| Method | Path | Handler |
|--------|------|---------|
| GET | /api/analytics | Get analytics data (query: from, to, granularity) |

---

### 2.7. FX Routes
**Found in:** `server/routes/fx.js`

| Method | Path | Handler |
|--------|------|---------|
| GET | /api/fx/latest | Get latest exchange rates |
| GET | /api/fx/convert | Convert amount between currencies |

---

### 2.8. Health Routes
**Found in:** `server/routes/health.js`

| Method | Path | Handler |
|--------|------|---------|
| GET | /api/health | Health check |

---

## 3. Frontend Views

### 3.1. CargoView
**Found in:** `src/views/CargoView.jsx`

**Features:**
- Kanban board with 9 columns
- PL cards with drag & drop
- Consolidation management
- Summary drawer

---

### 3.2. ClientsView
**Found in:** `src/views/ClientsView.jsx`

**Features:**
- Client list (left sidebar)
- Client card (right panel)
- Client PLs list
- Delete client button

---

### 3.3. AnalyticsPage
**Found in:** `src/views/AnalyticsPage.jsx`

**Features:**
- 3 charts: Client dynamics, PL by status, Weight dynamics
- Date range picker
- Granularity selector (day/week/month)
- Meta info display

---

### 3.4. LogisticsView
**Found in:** `src/views/LogisticsView.jsx`

**Features:**
- Placeholder view (minimal content)

---

### 3.5. WarehousesView
**Found in:** `src/views/WarehousesView.jsx`

**Features:**
- Warehouse list display (minimal UI)

---

## 4. Frontend Components

### 4.1. PLCard
**Found in:** `src/components/PLCard.jsx`

**Features:**
- 4 tabs: Info, Documents, Comments, Timeline
- Form fields: title, weight, volume, places, pickup address, shipper name, contacts
- Calculator integration
- Responsible assignment
- Cargo info copy

---

### 4.2. NewPLModal
**Found in:** `src/components/pl/NewPLModal.jsx`

**Features:**
- Client search with suggestions
- Fields: title, weight, volume, places, incoterm, pickup address
- Auto-create client if not exists

---

### 4.3. DocsList
**Found in:** `src/components/pl/DocsList.jsx`

**Features:**
- Document upload
- Document list with status
- Status change (uploaded → checked → approved/rejected)
- Document delete
- Status history

---

### 4.4. CommentsCard
**Found in:** `src/components/CommentsCard.jsx`

**Features:**
- Comment list
- Add comment
- Delete comment

---

### 4.5. CostCalculatorCard
**Found in:** `src/components/CostCalculatorCard.jsx`

**Features:**
- 2 legs with amount and currency (USD/KGS/CNY)
- Auto-calculate $/kg and $/m³
- Display exchange rates
- Customs fee input
- Other fee input
- Client price input
- Profit and margin calculation
- Save calculator snapshot with exchange rates

---

### 4.6. KanbanBoard
**Found in:** `src/components/kanban/KanbanBoard.jsx`

**Features:**
- 9 columns based on status pipeline
- Drag & drop PLs between columns
- Column counts

---

### 4.7. KanbanPLCard
**Found in:** `src/components/kanban/KanbanPLCard.jsx`

**Features:**
- Compact PL info display
- Drag handle
- Click to open full card

---

## 5. Status Constants

### 5.1. PL Statuses
**Found in:** `src/constants/statuses.js`

**List:** draft, awaiting_docs, awaiting_load, to_load, loaded, to_customs, released, kg_customs, collect_payment, closed, cancelled

**Total:** 11 statuses

**Kanban columns (9):**
1. intake (draft)
2. collect_docs (awaiting_docs)
3. collect_cargo (awaiting_load)
4. loading (to_load, loaded)
5. cn_formalities (to_customs)
6. in_transit (released)
7. kg_customs (kg_customs)
8. payment (collect_payment)
9. closed_stage (closed, cancelled)

---

### 5.2. Consolidation Statuses
**Found in:** `src/constants/statuses.js`, `server/db/schema.js`

**List:** to_load, loaded, to_customs, released, kg_customs, collect_payment, delivered, closed

**Total:** 8 statuses

---

### 5.3. Document Statuses
**Found in:** `src/components/pl/DocsList.jsx`

**UI statuses:** uploaded, checked_by_logistic, recheck_ok, rejected

**Server statuses:** pending, reviewed, approved, rejected

---

## 6. Features by Category

### 6.1. Authentication

**Implemented:**
- Login/logout
- Session management
- Role-based access (admin, logist, user)

**Found in:**
- `server/routes/auth.js`
- `server/db/schema.js` (users)
- `server/server.js` (authGuard)

**Missing:**
- User registration UI
- Password reset
- Password change UI

---

### 6.2. PL Management

**Implemented:**
- CRUD operations
- List with client info
- Detail card with tabs
- 11 statuses
- Kanban board (9 columns)
- Drag & drop between statuses
- Drag & drop between columns
- Responsible assignment
- Fields: title, weight, volume, places, incoterm, pickup address, shipper name, contacts

**Found in:**
- `server/routes/pl.js`
- `src/views/CargoView.jsx`
- `src/components/PLCard.jsx`
- `src/components/pl/NewPLModal.jsx`
- `src/constants/statuses.js`

**Partially implemented:**
- Warehouse management (FOB selection only)

**Missing:**
- Bulk operations
- Search and filter (except by client)

---

### 6.3. Client Management

**Implemented:**
- CRUD operations
- Search with transliteration
- Auto-create on PL creation
- View all client PLs

**Found in:**
- `server/routes/clients.js`
- `src/views/ClientsView.jsx`

**Missing:**
- Client history log
- Client segmentation

---

### 6.4. Consolidations

**Implemented:**
- CRUD operations
- Add/remove PLs
- 8 statuses
- Status history

**Found in:**
- `server/routes/consolidations.js`
- `server/db/schema.js`
- `src/views/CargoView.jsx`

**Missing:**
- Consolidation visualization (what's inside)
- Weight/volume aggregation

---

### 6.5. Documents

**Implemented:**
- File upload
- Disk storage (uploads/pl/<plId>/)
- 3 document types: invoice, packing_list, other
- 4 statuses with history
- Unique constraint: one type per PL

**Found in:**
- `server/routes/pl.js` (document endpoints)
- `server/db/schema.js` (plDocuments, plDocStatusHistory)
- `src/components/pl/DocsList.jsx`
- `src/constants/docs.js`

**Missing:**
- Document preview
- Document versioning

---

### 6.6. Comments

**Implemented:**
- CRUD operations
- UI in PL card
- Author and timestamp

**Found in:**
- `server/routes/pl.js`
- `server/db/schema.js` (plComments)
- `src/components/CommentsCard.jsx`

---

### 6.7. Timeline / Events

**Implemented:**
- Event model
- Event list API
- Timeline tab in PL card
- Auto-generated events for: creation, status change, responsible assignment, comment added, document uploaded

**Found in:**
- `server/db/schema.js` (plEvents)
- `server/routes/pl.js`
- `src/components/PLCard.jsx`

---

### 6.8. Calculator

**Implemented:**
- Client price field
- JSONB calculator snapshot
- Cost calculation (2 legs + customs + other)
- Margin and profit calculation
- Cargo density (kg/m³)
- Weight vs volume recommendation
- 3 currencies: USD, KGS, CNY
- NBKR exchange rates
- Rate snapshot on save
- $/kg and $/m³ from amount

**Found in:**
- `server/db/schema.js` (PL fields)
- `server/routes/fx.js`
- `src/components/CostCalculatorCard.jsx`

**Missing:**
- Price change history
- Client financial aggregates
- Consolidation financial aggregates

---

### 6.9. Analytics

**Implemented:**
- 3 snapshot tables
- Analytics API
- 3 charts in UI
- Snapshot generation script
- Granularity support: day, week, month

**Found in:**
- `server/db/schema.js` (analytics* tables)
- `server/routes/analytics.js`
- `server/scripts/build-analytics-snapshots.js`
- `src/views/AnalyticsPage.jsx`

**Partially implemented:**
- Automated snapshot generation (script exists, cron not configured)

---

## 7. File Inventory

### 7.1. Backend

| Category | Count | Files |
|----------|-------|-------|
| Routes | 8 | auth.js, users.js, clients.js, pl.js, consolidations.js, analytics.js, fx.js, health.js |
| Schema | 1 | schema.js |
| Scripts | 1 | build-analytics-snapshots.js |
| Migrations | 21 | 0000_*.sql through 0020_*.sql |

### 7.2. Frontend

| Category | Count | Key Files |
|----------|-------|-----------|
| Views | 5 | CargoView.jsx, ClientsView.jsx, AnalyticsPage.jsx, LogisticsView.jsx, WarehousesView.jsx |
| Components | 30+ | PLCard.jsx, NewPLModal.jsx, DocsList.jsx, CommentsCard.jsx, CostCalculatorCard.jsx, KanbanBoard.jsx, etc. |
| Hooks | 3 | useAnalytics.js, useMetrics.js |
| Constants | 4 | statuses.js, docs.js |
| API client | 1 | client.js |

---

## 8. Migrations List

**Found in:** `server/drizzle/`

1. 0000_loud_peter_parker.sql
2. 0001_pink_moira_mactaggert.sql
3. 0002_right_grey_gargoyle.sql
4. 0003_wandering_retro_girl.sql
5. 0004_amusing_slayback.sql
6. 0005_concerned_daredevil.sql
7. 0006_striped_thor.sql
8. 0007_public_gunslinger.sql
9. 0007_enable_pgcrypto.sql
10. 0008_eminent_pixie.sql
11. 0008_unique_doc_per_type.sql
12. 0009_consolidations_status_enum_v2.sql
13. 0009_jittery_energizer.sql
14. 0010_consolidations_tables.sql
15. 0010_jazzy_nemesis.sql
16. 0011_consolidations_updated_at_trigger.sql
17. 0011_nappy_cannonball.sql
18. 0012_blushing_magneto.sql
19. 0013_wakeful_tarantula.sql
20. 0014_spooky_titanium_man.sql
21. 0015_cute_maria_hill.sql
22. 0016_add_cons_statuses.sql
23. 0017_fix_cons_enum.sql
24. 0018_add_analytics_snapshots.sql
25. 0019_add_fx_calc_fields.sql
26. 0020_add_pl_places.sql

**Total:** 26 migration files

---

## 9. Summary

### Entities (13 total)
1. clients
2. pl
3. plDocuments
4. plDocStatusHistory
5. plComments
6. plEvents
7. consolidations
8. consolidationPl
9. consolidationStatusHistory
10. users
11. analyticsDailySnapshots
12. analyticsDailyPlStatus
13. analyticsDailyWeightStatus

### API Routes (8 total)
1. /api/auth/*
2. /api/users
3. /api/clients/*
4. /api/pl/*
5. /api/consolidations/*
6. /api/analytics
7. /api/fx/*
8. /api/health

### Frontend Views (5 total)
1. CargoView (Kanban)
2. ClientsView
3. AnalyticsPage
4. LogisticsView (placeholder)
5. WarehousesView (minimal)

### Status Types
- PL: 11 statuses
- Consolidations: 8 statuses
- Documents: 4 statuses

---

**End of document**
