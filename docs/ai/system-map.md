# SYSTEM MAP — MYLOGISTICS

This document is a high-level architecture map of the myLogistics system.

Its purpose is to help developers and AI coding agents quickly understand:

- where core logic lives
- how frontend actions map to backend routes
- how backend routes map to database operations
- which files are likely involved in a given feature or bug
- how key workflows move through the system

This file is a navigation aid.
It does not replace direct code inspection.

If the code and this file ever disagree, the code is the source of truth.


---------------------------------------------------------------------
1. SYSTEM LAYERS

Frontend
- React
- Vite
- Tailwind
- Kanban UI
- Cargo card / PL card UI
- Consolidation UI

Backend
- Fastify routes
- validation
- business logic
- transaction handling
- file handling

Database
- PostgreSQL
- Drizzle ORM
- canonical system state

File storage
- local filesystem
- uploads/pl/{plId}/...


---------------------------------------------------------------------
2. CORE DOMAIN OBJECTS

PL (Packing List)
Represents a cargo shipment.

Main properties:
- id
- plNumber
- status
- clientId
- name
- weight
- volume
- places
- calculator fields
- responsible user fields

Consolidation
Represents a grouped shipment containing multiple PLs.

Main properties:
- id
- consNumber
- status
- title
- capacityKg
- capacityCbm
- machineCost

Document
Represents a file attached to a PL.

Main properties:
- id
- plId
- docType
- name
- fileName
- storagePath
- status

Comment
Represents an operator comment on a PL.

Event
Represents timeline history for a PL.


---------------------------------------------------------------------
3. PRIMARY DATABASE TABLES

Core workflow tables
- clients
- users
- pl
- consolidations
- consolidationPl

Document tables
- plDocuments
- plDocStatusHistory

Communication / timeline tables
- plComments
- plEvents

History tables
- consolidationStatusHistory

Analytics tables
- analyticsDailySnapshots
- analyticsDailyPlStatus
- analyticsDailyWeightStatus


---------------------------------------------------------------------
4. KEY FRONTEND AREAS

Likely frontend entry points:

Cargo / PL
- src/views/CargoView.jsx
- src/components/PLCard.jsx

Documents
- src/components/pl/DocsList.jsx
- src/components/ui/DocStatusBadge.jsx
- src/constants/docs.js

Kanban
- KanbanBoard component
- KanbanPLCard component
- KanbanConsCard component

API client
- src/api/client.js

If a bug is in PL details, tabs, documents, counters, or calculator:
start from CargoView.jsx and PLCard.jsx.

If a bug is in drag-and-drop:
start from KanbanBoard and card drag handlers.

If a bug is in document UI:
start from DocsList.jsx.


---------------------------------------------------------------------
5. KEY BACKEND AREAS

Likely backend entry points:

PL routes
- server/routes/pl.js

Consolidation routes
- server/routes/consolidations.js

Storage
- server/services/storage.js

Schema
- server/db/schema.js

If a bug is in:
- PL details → inspect server/routes/pl.js
- documents → inspect server/routes/pl.js + storage.js
- consolidation movement → inspect server/routes/consolidations.js
- schema / relations → inspect server/db/schema.js


---------------------------------------------------------------------
6. API MAP — PL

Main PL routes:

GET /api/pl
List PLs.

GET /api/pl/:id
Get full PL details, including:
- PL data
- client data
- responsible user data
- _counts for docs/comments/history
- calculator fields

POST /api/pl
Create PL.

PUT /api/pl/:id
Update PL.

DELETE /api/pl/:id
Delete PL.

Related PL routes:

GET /api/pl/:plId/events
Get timeline events.

POST /api/pl/:plId/comments
Create comment.

GET /api/pl/:id/avatar
Get responsible user avatar.

POST /api/pl/import
Import PLs from Excel.


---------------------------------------------------------------------
7. API MAP — DOCUMENTS

Documents are nested under PL routes:

GET /api/pl/:plId/docs
List PL documents.

POST /api/pl/:plId/docs
Upload document.

PATCH /api/pl/:plId/docs/:docId
Update document status / note / name.

DELETE /api/pl/:plId/docs/:docId
Delete document.

GET /api/pl/:plId/docs/:docId/history
Get document status history.

GET /api/pl/:plId/docs/:docId/preview
Preview document inline.

GET /api/pl/:plId/docs/:docId/download
Download document.


---------------------------------------------------------------------
8. API MAP — CONSOLIDATIONS

GET /api/consolidations
List consolidations.

GET /api/consolidations/:id
Get consolidation with related PL data.

POST /api/consolidations
Create consolidation.

PATCH /api/consolidations/:id
Update consolidation.

DELETE /api/consolidations/:id
Delete consolidation.

POST /api/consolidations/:id/pl
Add PL to consolidation.

DELETE /api/consolidations/:id/pl/:plId
Remove PL from consolidation.

POST /api/consolidations/:id/pls
Replace / set consolidation PL list.

POST /api/consolidations/:id/expenses
Add expense.

DELETE /api/consolidations/:id/expenses/:expenseId
Delete expense.


---------------------------------------------------------------------
9. REQUEST FLOW MAP — OPEN CARGO CARD

Frontend flow:
User opens cargo card
→ CargoView / PL card open state updates
→ frontend calls GET /api/pl/:id
→ backend returns PL payload
→ frontend renders:
  - PL data
  - client data
  - responsible user data
  - counters
  - calculator fields

Important rule:
Opening cargo card should be treated as a controlled network flow.
Avoid introducing unnecessary parallel requests.


---------------------------------------------------------------------
10. REQUEST FLOW MAP — DOCUMENTS

Current flow:
User opens Documents tab
→ frontend DocsList requests GET /api/pl/:plId/docs
→ backend returns document array
→ DocsList renders documents

Upload flow:
User selects file
→ frontend POST /api/pl/:plId/docs
→ backend saves file to uploads/pl/{plId}/...
→ backend writes metadata to plDocuments
→ frontend refreshes document list

Preview flow:
User clicks preview
→ frontend loads GET /api/pl/:plId/docs/:docId/preview
→ backend streams file inline

Download flow:
User clicks download
→ frontend loads GET /api/pl/:plId/docs/:docId/download
→ backend returns attachment response

Delete flow:
User clicks delete
→ frontend DELETE /api/pl/:plId/docs/:docId
→ backend deletes metadata / document record
→ frontend refreshes document list


---------------------------------------------------------------------
11. REQUEST FLOW MAP — KANBAN PL MOVE

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


---------------------------------------------------------------------
12. REQUEST FLOW MAP — KANBAN CONSOLIDATION MOVE

Frontend flow:
User drags consolidation card
→ drag data set in consolidation card
→ drop handled in KanbanBoard
→ CargoView move handler calls API.updateCons(consId, { status: newStatus })
→ backend PATCH /api/consolidations/:id
→ backend transaction runs
→ consolidation status updated
→ all linked PL statuses synchronized
→ status history recorded
→ frontend refreshes list

Likely investigation path:
Kanban consolidation card
→ KanbanBoard handleDrop()
→ CargoView consolidation move handler
→ src/api/client.js
→ server/routes/consolidations.js
→ server/db/schema.js


---------------------------------------------------------------------
13. DOCUMENT MODEL MAP

Required documents
- invoice
- packing_list
- inspection
- pre_declaration

Behavior:
- singleton per PL
- upload uses replace / upsert behavior
- verification workflow applies

Additional documents
- doc_type = additional
- name required
- multiple allowed
- no verification workflow

UI map:
Required documents are typically rendered from DOC_TYPES.
Additional documents are rendered as a separate list or grouped section.

Backend map:
- file saved on disk
- metadata stored in plDocuments
- status history stored in plDocStatusHistory when applicable


---------------------------------------------------------------------
14. CALCULATOR MAP

Calculator fields live on the PL side.

Typical values include:
- leg1Amount
- leg1AmountUsd
- leg2ManualAmount
- leg2UsdPerKg
- leg2UsdPerM3

If a calculator bug occurs, inspect:
- PL payload returned by GET /api/pl/:id
- PL update route in server/routes/pl.js
- frontend calculator rendering in PL card / cargo components
- any derived state in frontend depending on weight, volume, and leg amounts


---------------------------------------------------------------------
15. EVENT / COMMENT / HISTORY MAP

Comments:
POST /api/pl/:plId/comments

Events:
GET /api/pl/:plId/events

Timeline may include:
- document events
- comments
- status changes
- consolidation-related events

If a timeline bug occurs:
inspect
- PL events route
- event creation logic in route handlers
- frontend history / timeline tab rendering


---------------------------------------------------------------------
16. INVESTIGATION STARTING POINTS

If the issue is about...
- cargo card data → start with GET /api/pl/:id
- counters → inspect GET /api/pl/:id payload and tab rendering
- documents → inspect DocsList.jsx + /api/pl/:plId/docs routes
- document preview/download → inspect document routes + storage.js
- PL status movement → inspect CargoView + PL update route
- consolidation sync → inspect PATCH /api/consolidations/:id + transaction logic
- comments/history → inspect /api/pl/:plId/comments and /api/pl/:plId/events
- calculator values → inspect PL payload + PL update + calculator UI


---------------------------------------------------------------------
17. ARCHITECTURE GUARDRAILS

Always remember:

- Backend is the single source of truth.
- Frontend must not invent final state.
- Avoid N+1 calls.
- Avoid frontend workarounds for backend issues.
- Multi-table changes must use transactions.
- Existing features should be extended, not duplicated.
- If behavior is unclear, inspect code before acting.


---------------------------------------------------------------------
18. PURPOSE OF THIS FILE

This file exists to reduce hallucinations and speed up code investigation.

It should help an AI coding agent answer:

- where should I start looking?
- which frontend component is likely involved?
- which backend route is likely involved?
- which database tables are likely involved?
- what is the expected request flow?

This file is a navigation map, not a substitute for reading the code.
