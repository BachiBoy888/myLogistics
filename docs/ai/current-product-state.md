# CURRENT PRODUCT STATE — MYLOGISTICS (FINAL)

This document describes the actual current implementation of the myLogistics system based on direct code inspection.

Its purpose is to provide developers and AI coding agents with an accurate picture of:

- implemented system behavior
- current API surface
- current data model
- confirmed request flows
- important technical and product limitations

This document must describe confirmed behavior from code, not assumptions.

If code and this file disagree, code is the source of truth.

---

# SYSTEM OVERVIEW

MyLogistics is currently implemented as a logistics operations platform managing:

- leads
- clients
- packing lists (PL)
- consolidations
- logistics workflow stages
- operational documents
- comments and timeline events

System layers:

## Frontend
- React
- Vite
- Tailwind

## Backend
- Fastify REST API

## Database
- PostgreSQL with Drizzle ORM

## File storage
- local filesystem for document uploads

---

# LEAD API ROUTES (/api/leads)

## GET /api/leads/:id/convert-preview

Current behavior:
- read-only preview endpoint
- returns lead-related conversion context
- does not mutate data

Confirmed response structure includes:
- lead
- existingLinks
- exactPhoneMatches
- flags
- proposedNewClient

Confirmed behavior:
- used to help user choose conversion path
- already converted lead is represented via flags in response
- preview remains non-mutating

---

## POST /api/leads/:id/convert-to-pl

Current behavior:
- converts lead into PL
- supports explicit client resolution flow

Confirmed conversion modes:
- mode = existing
- mode = new

Observed behavior:
- existing mode uses provided client selection
- new mode creates a new client before PL creation

Confirmed backend behavior includes:
- validation
- transactional write flow
- converted lead update
- PL creation

---

# LEAD CONVERSION — CURRENT IMPLEMENTATION

Current system supports lead → client → PL conversion.

Confirmed characteristics from implementation:

- conversion is backend-controlled
- preview and mutation are separated
- phone matching is used for suggestion support
- final conversion supports explicit decision path
- concurrency protection exists in conversion flow
- conversion writes occur inside transaction

Observed high-level conversion flow:

1. load lead
2. build preview / matching context
3. user chooses conversion mode
4. backend resolves client
5. backend creates PL
6. backend updates lead conversion state

---

# PHONE NORMALIZATION / MATCHING

Current implementation includes phone normalization helper logic.

Observed behavior:
- multiple KG-style phone formats are normalized for comparison
- invalid values may normalize to null
- phone matching is used to produce preview suggestions

Examples handled by normalization logic include variants such as:
- 0220447446
- +996220447446
- 996220447446
- 220447446

Current matching behavior:
- exactPhoneMatches is returned as an array
- matching is used in preview/support logic
- automatic uniqueness assumption is not guaranteed by matching alone

If legacy fallback still exists in code path:
- conversion without explicit resolution may still go through compatibility behavior
- such path should be treated as temporary current behavior, not desired final design

---

# PL API ROUTES (/api/pl)

## GET /api/pl
Lists packing lists with client-related data.

## GET /api/pl/:id
Returns detailed PL payload.

Confirmed payload includes:

### PL fields
- id
- plNumber
- name
- weight
- volume
- places
- incoterm
- pickupAddress
- status

### Client data
- id
- name
- phone
- company

### Responsible user data
- name
- is_active

### Counters
_counts:
- docs
- comments
- history

### Calculator fields
- leg1Amount
- leg1AmountUsd
- leg2ManualAmount
- leg2UsdPerKg
- leg2UsdPerM3

## POST /api/pl
Creates a new PL.

Observed behavior:
- PL number is generated automatically
- format follows PL-YYYY-{id}

## PUT /api/pl/:id
Updates PL fields, including calculator-related fields.

## DELETE /api/pl/:id
Deletes PL.

---

# DOCUMENT SYSTEM

Documents are attached to PL records.

## Routes

- GET /api/pl/:plId/docs
- POST /api/pl/:plId/docs
- PATCH /api/pl/:plId/docs/:docId
- DELETE /api/pl/:plId/docs/:docId
- GET /api/pl/:plId/docs/:docId/history
- GET /api/pl/:plId/docs/:docId/preview
- GET /api/pl/:plId/docs/:docId/download

---

# DOCUMENT STORAGE

Current implementation stores files locally on disk.

Storage pattern:
- ./uploads/pl/{plId}/{timestamp}__{filename}

Metadata is stored in:
- plDocuments

Storage handling is implemented through:
- server/services/storage.js

Confirmed helper:
- savePLFile()

---

# DOCUMENT TYPES

Two document categories are currently implemented.

## Required documents

Observed behavior:
- singleton per type
- database name field is null
- upload uses replace / upsert style behavior

Types include:
- invoice
- packing_list
- inspection
- pre_declaration

## Additional documents

Observed behavior:
- unlimited allowed
- docType = additional
- custom name required
- upload uses insert behavior

---

# DOCUMENT STATUS WORKFLOW

Current required-document status flow includes:

- pending
- reviewed
- approved
- rejected

Observed behavior:
- rejection can occur from different states
- history is stored in plDocStatusHistory

---

# ADDITIONAL PL ROUTES

## GET /api/pl/:plId/events
Returns PL timeline events.

Observed event categories include:
- document actions
- comments
- status changes
- consolidation-related events

## POST /api/pl/:plId/comments
Creates comment for PL.

## GET /api/pl/:id/avatar
Returns responsible user avatar.

## POST /api/pl/import
Imports PL records from Excel.

---

# CONSOLIDATION API ROUTES (/api/consolidations)

- GET /api/consolidations
- GET /api/consolidations/:id
- POST /api/consolidations
- PATCH /api/consolidations/:id
- DELETE /api/consolidations/:id
- POST /api/consolidations/:id/pl
- DELETE /api/consolidations/:id/pl/:plId
- POST /api/consolidations/:id/pls
- POST /api/consolidations/:id/expenses
- DELETE /api/consolidations/:id/expenses/:expenseId

Observed behavior:
- consolidation detail returns related PL data and expenses
- initial PL attachment may happen during creation

---

# CONSOLIDATION STATUS LOGIC

Current PATCH /api/consolidations/:id behavior runs inside a transaction.

Observed behavior:
1. when consolidation status changes, linked PL statuses are synchronized
2. consolidation record is updated
3. consolidationStatusHistory record is inserted

Confirmed status pipeline includes:
- to_load
- loaded
- to_customs
- released
- kg_customs
- collect_payment
- delivered
- closed

---

# KANBAN WORKFLOW

Kanban is currently used to visualize cargo workflow.

Each column maps to a status.

Observed frontend drag-and-drop flow:

## PL move
- drag starts in KanbanPLCard.jsx
- drop handled in KanbanBoard.jsx
- CargoView.jsx handles move
- frontend calls API.updatePL(plId, { status: newStatus })
- frontend refreshes PL list

## Consolidation move
- drag starts in KanbanConsCard.jsx
- drop handled in KanbanBoard.jsx
- frontend calls API.updateCons(consId, { status: newStatus })
- backend updates consolidation and syncs linked PLs
- frontend refreshes PL list

Observed frontend refresh behavior:
- refreshPLs()

---

# DATABASE TABLES

## Core tables
- leads
- clients
- users
- pl
- consolidations
- consolidationPl

## Document tables
- plDocuments
- plDocStatusHistory

## Communication tables
- plComments
- plEvents

## History tables
- consolidationStatusHistory

## Analytics tables
- analyticsDailySnapshots
- analyticsDailyPlStatus
- analyticsDailyWeightStatus

---

# DATA RELATIONSHIPS

Observed relationships:

- clients (1) → (N) pl
- users (1) → (N) pl.responsibleUserId
- pl (1) → (N) plDocuments
- pl (1) → (N) plComments
- pl (1) → (N) plEvents
- pl (1) → (N) consolidationPl → (N) consolidations

Lead conversion-related links currently include:
- leads.clientId (nullable)
- leads.convertedPlId (nullable)

---

# CURRENT PRODUCT / TECHNICAL CHARACTERISTICS

Confirmed in current implementation:

- backend is the source of truth
- documents use local file storage
- PL detail payload includes counters and calculator fields
- consolidations synchronize PL statuses during status change
- lead conversion is now part of implemented system behavior
- explicit client resolution flow exists
- phone-based suggestions exist
- transaction-based conversion logic exists

Current limitations / transitional characteristics may include:
- duplicate clients may still be possible
- phone matching is not proof of identity
- legacy fallback behavior may still remain for compatibility
- some newer behavior may coexist with older paths during migration

---

# ARCHITECTURE SUMMARY

Backend:
- Fastify REST API
- Drizzle ORM
- PostgreSQL
- transaction-based critical flows

Frontend:
- React + Vite + Tailwind
- Kanban drag-and-drop workflows
- REST-driven UI refresh pattern

Documents:
- stored on local filesystem
- metadata in database

Workflow:
- leads may convert into PL
- PLs move through statuses
- consolidations group PLs and synchronize statuses
- documents, comments, and events support operations
- calculator fields remain stored on PL
