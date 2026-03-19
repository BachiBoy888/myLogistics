# SYSTEM MAP — MYLOGISTICS (FINAL)

This document is a high-level architecture and navigation map of the myLogistics system.

Its purpose is to help developers and AI coding agents quickly understand:

- where core logic lives
- how frontend actions map to backend routes
- how backend routes map to database operations
- which files are likely involved in a feature or bug
- how key workflows move through the system

This file is a navigation aid.
It does NOT replace direct code inspection.

If code and this file disagree, code is the source of truth.

---

# 1. SYSTEM OVERVIEW

MyLogistics manages the full operational lifecycle:

Lead → Client → PL → Consolidation → Delivery

The system includes:

- lead intake
- client resolution
- PL creation and logistics tracking
- consolidation management
- document handling
- comments and timeline events
- operational workflow via Kanban UI

---

# 2. SYSTEM LAYERS

## Frontend
- React
- Vite
- Tailwind
- Kanban UI
- Lead conversion UI
- Cargo / PL card UI
- Consolidation UI
- Documents UI

## Backend
- Fastify routes
- validation
- business logic
- transactions
- file handling
- phone normalization helpers

## Database
- PostgreSQL
- Drizzle ORM
- canonical system state

## File Storage
- local filesystem
- uploads/pl/{plId}/...

---

# 3. CORE DOMAIN OBJECTS

## Lead
Incoming customer request before operational cargo exists.

## Client
The real owner of cargo.

## PL (Packing List)
Main operational shipment entity.

## Consolidation
Grouped shipment containing multiple PLs.

## Document
File attached to a PL.

## Comment
Operator comment on a PL.

## Event
Timeline history entry for a PL.

---

# 4. PRIMARY DATABASE TABLES

## Core workflow tables
- leads
- clients
- users
- pl
- consolidations
- consolidationPl

## Document tables
- plDocuments
- plDocStatusHistory

## Communication / timeline
- plComments
- plEvents

## History
- consolidationStatusHistory

## Analytics
- analyticsDailySnapshots
- analyticsDailyPlStatus
- analyticsDailyWeightStatus

---

# 5. KEY FRONTEND AREAS

Likely frontend entry points:

## Lead conversion
- lead detail / conversion modal/page
- preview request caller
- conversion submit handler

## Cargo / PL
- src/views/CargoView.jsx
- src/components/PLCard.jsx

## Documents
- src/components/pl/DocsList.jsx
- src/components/ui/DocStatusBadge.jsx
- src/constants/docs.js

## Kanban
- KanbanBoard component
- KanbanPLCard component
- KanbanConsCard component

## API client
- src/api/client.js

Investigation guidance:
- lead conversion bug → start from lead conversion UI + preview/convert API calls
- PL details bug → start from CargoView.jsx / PLCard.jsx
- drag-and-drop bug → start from KanbanBoard
- document UI bug → start from DocsList.jsx

---

# 6. KEY BACKEND AREAS

Likely backend entry points:

- server/routes/leads.js
- server/routes/clients.js
- server/routes/pl.js
- server/routes/consolidations.js
- server/services/storage.js
- server/lib/phone.js
- server/db/schema.js

Investigation guidance:
- lead conversion → inspect leads.js + phone.js + schema.js
- PL details → inspect pl.js
- documents → inspect pl.js + storage.js
- consolidation movement → inspect consolidations.js
- schema / relations → inspect schema.js

---

# 7. API MAP — LEADS

## GET /api/leads/:id/convert-preview
Read-only preview endpoint.

Returns:
- lead
- existingLinks
- exactPhoneMatches[]
- flags
- proposedNewClient

Behavior:
- always preview-oriented
- used to assist user decision
- must NOT mutate state

## POST /api/leads/:id/convert-to-pl
Mutation endpoint.

Behavior:
- requires explicit clientResolution
- transaction-based
- must prevent double conversion
- must update lead and create PL consistently

---

# 8. REQUEST FLOW MAP — LEAD → CLIENT → PL

Frontend flow:
1. User opens lead
2. Frontend calls GET /api/leads/:id/convert-preview
3. Backend:
   - loads lead
   - normalizes phone
   - finds matching clients / links
   - returns suggestions
4. User explicitly chooses:
   - existing client
   - or create new client
5. Frontend calls POST /api/leads/:id/convert-to-pl
6. Backend transaction:
   - lock lead (FOR UPDATE)
   - verify not already converted
   - resolve client explicitly
   - create PL
   - update lead
   - commit

Critical rule:
- NO automatic client linking in final conversion

---

# 9. CLIENT RESOLUTION MAP

## Explicit modes

### mode = existing
Use provided clientId.

### mode = new
Always create new client.

Rules:
- system may suggest
- system must NOT decide
- correctness of client identity is more important than convenience

---

# 10. PHONE MATCHING MAP

Phone matching is used only for:

- preview suggestions
- temporary legacy fallback (if still supported)

Flow:
1. normalize lead.phone
2. generate matching variants
3. query candidate clients

Rules:
- matching is suggestion-only
- NEVER use for automatic final conversion
- NO full table scan allowed

Canonical normalization target:
- 996XXXXXXXXX

Invalid phone:
- normalize → null

---

# 11. API MAP — PL

## Main routes
- GET /api/pl
- GET /api/pl/:id
- POST /api/pl
- PUT /api/pl/:id
- DELETE /api/pl/:id

## Related routes
- GET /api/pl/:plId/events
- POST /api/pl/:plId/comments
- GET /api/pl/:id/avatar
- POST /api/pl/import

GET /api/pl/:id typically returns:
- PL data
- client data
- responsible user data
- counters
- calculator fields

---

# 12. API MAP — DOCUMENTS

Documents are nested under PL routes:

- GET /api/pl/:plId/docs
- POST /api/pl/:plId/docs
- PATCH /api/pl/:plId/docs/:docId
- DELETE /api/pl/:plId/docs/:docId
- GET /api/pl/:plId/docs/:docId/history
- GET /api/pl/:plId/docs/:docId/preview
- GET /api/pl/:plId/docs/:docId/download

---

# 13. API MAP — CONSOLIDATIONS

- GET /api/consolidations
- GET /api/consolidations/:id
- POST /api/consolidations
- PATCH /api/consolidations/:id
- DELETE /api/consolidations/:id

PL linking routes:
- POST /api/consolidations/:id/pl
- DELETE /api/consolidations/:id/pl/:plId
- POST /api/consolidations/:id/pls

Expenses:
- POST /api/consolidations/:id/expenses
- DELETE /api/consolidations/:id/expenses/:expenseId

---

# 14. REQUEST FLOW MAP — OPEN CARGO CARD

Frontend flow:
User opens cargo card
→ frontend calls GET /api/pl/:id
→ backend returns full PL payload
→ frontend renders:
  - PL data
  - client data
  - responsible user data
  - counters
  - calculator fields

Important rule:
Opening cargo card must be a controlled network flow.
Avoid unnecessary parallel requests.

---

# 15. REQUEST FLOW MAP — DOCUMENTS

Current flow:
User opens Documents tab
→ frontend requests GET /api/pl/:plId/docs
→ backend returns document array
→ frontend renders documents

Upload flow:
User selects file
→ POST /api/pl/:plId/docs
→ backend saves file to uploads/pl/{plId}/...
→ backend writes metadata to plDocuments
→ frontend refreshes list

Preview flow:
User clicks preview
→ GET /api/pl/:plId/docs/:docId/preview
→ backend streams file inline

Download flow:
User clicks download
→ GET /api/pl/:plId/docs/:docId/download
→ backend returns attachment response

Delete flow:
User clicks delete
→ DELETE /api/pl/:plId/docs/:docId
→ backend deletes metadata / record
→ frontend refreshes list

---

# 16. REQUEST FLOW MAP — KANBAN PL MOVE

Frontend flow:
User drags PL card
→ drag data set in card component
→ drop handled in KanbanBoard
→ CargoView handlePLMove() called
→ frontend sends API.updatePL(plId, { status: newStatus })
→ backend updates PL status
→ frontend refreshes PL list

Likely investigation path:
Kanban card
→ KanbanBoard handleDrop()
→ CargoView handlePLMove()
→ src/api/client.js
→ backend PL update route

---

# 17. REQUEST FLOW MAP — KANBAN CONSOLIDATION MOVE

Frontend flow:
User drags consolidation card
→ drop handled in KanbanBoard
→ frontend sends PATCH /api/consolidations/:id
→ backend transaction runs
→ consolidation status updated
→ linked PL statuses synchronized
→ history recorded
→ frontend refreshes list

Critical rule:
Consolidation and contained PLs must remain consistent.

---

# 18. DOCUMENT MODEL MAP

## Required documents
- invoice
- packing_list
- inspection
- pre_declaration

Behavior:
- singleton per PL
- replace / upsert behavior
- verification workflow applies

## Additional documents
- docType = additional
- name required
- multiple allowed
- no verification workflow

Backend:
- file saved on disk
- metadata stored in plDocuments
- status history stored in plDocStatusHistory

---

# 19. PL LIFECYCLE MAP

Typical PL statuses:
- draft
- awaiting_docs
- awaiting_load
- to_load
- to_customs
- released
- kg_customs
- collect_payment
- closed

PL belongs to:
- exactly one client
- optionally one consolidation

---

# 20. CONSOLIDATION MAP

Consolidation groups multiple PLs into one shipment.

Typical attributes:
- id
- consNumber
- status
- title
- capacityKg
- capacityCbm
- machineCost

Critical rule:
status changes may require synchronized PL updates.

---

# 21. CALCULATOR MAP

Calculator fields usually live on the PL side.

Typical values:
- leg1Amount
- leg1AmountUsd
- leg2ManualAmount
- leg2UsdPerKg
- leg2UsdPerM3

If calculator bug occurs, inspect:
- GET /api/pl/:id payload
- PL update route in server/routes/pl.js
- frontend calculator rendering
- derived frontend state using weight / volume / leg values

---

# 22. EVENT / COMMENT / HISTORY MAP

Comments:
- POST /api/pl/:plId/comments

Events:
- GET /api/pl/:plId/events

Timeline may include:
- document events
- comments
- status changes
- consolidation-related events

If timeline bug occurs:
inspect:
- events route
- event creation logic
- timeline UI rendering

---

# 23. INVESTIGATION STARTING POINTS

If the issue is about...

- lead conversion → inspect leads preview/convert routes + phone normalization + lead conversion UI
- cargo card data → start with GET /api/pl/:id
- counters → inspect GET /api/pl/:id payload + tab rendering
- documents → inspect DocsList.jsx + /api/pl/:plId/docs routes
- preview/download → inspect document routes + storage.js
- PL status movement → inspect CargoView + PL update route
- consolidation sync → inspect PATCH /api/consolidations/:id + transaction logic
- comments/history → inspect /api/pl/:plId/comments and /api/pl/:plId/events
- calculator values → inspect PL payload + PL update + calculator UI

---

# 24. ARCHITECTURE GUARDRAILS

Always remember:

- Backend is the single source of truth
- Frontend must not invent final state
- Avoid N+1 calls
- Avoid frontend workarounds for backend issues
- Multi-table changes must use transactions
- Lead conversion must remain explicit
- Phone matching is suggestion-only
- If behavior is unclear, inspect code before acting

---

# 25. PURPOSE OF THIS FILE

This file exists to reduce hallucinations and speed up code investigation.

It should help an AI coding agent answer:

- where should I start looking?
- which frontend component is likely involved?
- which backend route is likely involved?
- which database tables are likely involved?
- what is the expected request flow?

This is a navigation map, not a substitute for reading the code.
