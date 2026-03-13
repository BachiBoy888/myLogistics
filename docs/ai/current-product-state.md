# CURRENT PRODUCT STATE — MYLOGISTICS

This document describes the **actual current implementation** of the myLogistics system
based on direct inspection of the codebase.

The purpose of this file is to give developers and AI coding agents an accurate picture
of the system behavior, API surface, and data model.

This document must reflect **confirmed behavior from code**, not assumptions.


---------------------------------------------------------------------
SYSTEM OVERVIEW

myLogistics is a logistics operations platform used to manage:

- cargo shipments
- packing lists (PL)
- shipment consolidations
- logistics workflow stages
- operational documents
- comments and timeline events

The system consists of:

Frontend
React + Vite + Tailwind

Backend
Fastify REST API

Database
PostgreSQL with Drizzle ORM


---------------------------------------------------------------------
PL API ROUTES (/api/pl)

Core PL routes:

GET /api/pl
List all packing lists including client data.

GET /api/pl/:id
Return full PL information including:

- all PL fields
- client information
- responsible user information
- counters for documents, comments, and history
- calculator fields


Returned structure includes:

PL core fields:
- id
- plNumber
- name
- weight
- volume
- places
- incoterm
- pickupAddress
- status

Client data:
- id
- name
- phone
- company

Responsible user data:
- name
- is_active

Tab counters:
_counts:
- docs
- comments
- history

Calculator fields:
- leg1Amount
- leg1AmountUsd
- leg2ManualAmount
- leg2UsdPerKg
- leg2UsdPerM3


POST /api/pl
Create a new PL.

Automatically generates PL number using format:

PL-YYYY-{id}


PUT /api/pl/:id
Full PL update.

Supports calculator field updates.


DELETE /api/pl/:id
Delete a packing list.


---------------------------------------------------------------------
DOCUMENT SYSTEM

Documents are attached to packing lists.

Routes:

GET /api/pl/:plId/docs
List all documents attached to the PL.

POST /api/pl/:plId/docs
Upload a document.

Behavior depends on document type.

PATCH /api/pl/:plId/docs/:docId
Update document status, note, or name.

DELETE /api/pl/:plId/docs/:docId
Delete document.

GET /api/pl/:plId/docs/:docId/history
Return document status change history.

GET /api/pl/:plId/docs/:docId/preview
Inline preview of document.

GET /api/pl/:plId/docs/:docId/download
Download document as attachment.


---------------------------------------------------------------------
DOCUMENT STORAGE

Files are stored locally on disk.

Storage location:

./uploads/pl/{plId}/{timestamp}__{filename}

Metadata is stored in the database table:

plDocuments

File storage is handled by:

server/services/storage.js

Function:

savePLFile()


---------------------------------------------------------------------
DOCUMENT TYPES

Two categories of documents exist.


Required documents

Only one document allowed per type (singleton).

Database field:

name = NULL

Types:

invoice — Инвойс
packing_list — Упаковочный лист
inspection — Осмотр
pre_declaration — Предварительное информирование


Additional documents

Unlimited documents allowed.

Database field:

doc_type = 'additional'

User must provide a custom document name.


Upload behavior:

Required documents:
UPSERT (existing document replaced).

Additional documents:
INSERT (always new document).


---------------------------------------------------------------------
DOCUMENT STATUS WORKFLOW

Status pipeline for required documents:

pending → reviewed → approved

Rejection can occur from any status:

rejected


---------------------------------------------------------------------
ADDITIONAL PL ROUTES

GET /api/pl/:plId/events

Returns timeline events including:

- document actions
- comments
- status changes
- consolidation events


POST /api/pl/:plId/comments

Add comment to PL.


GET /api/pl/:id/avatar

Returns responsible user avatar (lazy loaded).


POST /api/pl/import

Import packing lists from Excel.


---------------------------------------------------------------------
CONSOLIDATION API ROUTES (/api/consolidations)

GET /api/consolidations

List consolidations.

Optional filter:

?status=


GET /api/consolidations/:id

Returns consolidation with:

- PL list
- PL details
- expenses


POST /api/consolidations

Create consolidation.

Optional:

Attach initial PLs.


PATCH /api/consolidations/:id

Update consolidation fields:

- title
- status
- capacityKg
- capacityCbm
- machineCost


DELETE /api/consolidations/:id

Delete consolidation.


POST /api/consolidations/:id/pl

Add a PL to consolidation.


DELETE /api/consolidations/:id/pl/:plId

Remove PL from consolidation.


POST /api/consolidations/:id/pls

Batch replace PLs for consolidation.


POST /api/consolidations/:id/expenses

Add consolidation expense.


DELETE /api/consolidations/:id/expenses/:expenseId

Delete expense.


---------------------------------------------------------------------
CONSOLIDATION STATUS LOGIC

PATCH /api/consolidations/:id executes inside a database transaction.

Transaction steps:

1. If consolidation status changes:

Synchronize ALL PL statuses to the same status.

2. Update consolidation record.

3. Insert status change record into:

consolidationStatusHistory


Status pipeline:

to_load
loaded
to_customs
released
kg_customs
collect_payment
delivered
closed


---------------------------------------------------------------------
KANBAN WORKFLOW

The Kanban board represents cargo workflow stages.

Each column corresponds to a cargo status.

Users move items using drag-and-drop.


Frontend flow:

Drag start occurs in:

KanbanPLCard.jsx
KanbanConsCard.jsx

Drag data stored in dataTransfer.


Drop handler:

KanbanBoard.jsx → handleDrop()


Move handler:

CargoView.jsx → handlePLMove()


Frontend API behavior:

Moving a PL:

API.updatePL(plId, { status: newStatus })


Moving a consolidation:

API.updateCons(consId, { status: newStatus })


After mutation:

Frontend refreshes PL list.

refreshPLs()


---------------------------------------------------------------------
DATABASE TABLES


Core tables

clients
Stores customer information.

users
System users.

pl
Packing lists (cargo records).

consolidations
Shipment consolidations.

consolidationPl
Join table linking PLs and consolidations.


Document tables

plDocuments
Document metadata.

plDocStatusHistory
Document status audit trail.


Communication tables

plComments
User comments for PLs.

plEvents
Timeline events.


History tables

consolidationStatusHistory
Audit log for consolidation status changes.


Analytics tables

analyticsDailySnapshots
Daily aggregated metrics.

analyticsDailyPlStatus
Daily counts of PLs by status.

analyticsDailyWeightStatus
Daily cargo weight totals by status.


---------------------------------------------------------------------
DATA RELATIONSHIPS

clients (1) → (N) pl

users (1) → (N) pl.responsibleUserId

pl (1) → (N) plDocuments
pl (1) → (N) plComments
pl (1) → (N) plEvents

pl (1) → (N) consolidationPl → (N) consolidations


---------------------------------------------------------------------
ARCHITECTURE SUMMARY

Backend
Fastify REST API with Drizzle ORM and PostgreSQL.

Frontend
React + Vite + Tailwind with Kanban drag-and-drop interface.

Documents
Stored on local filesystem with metadata in database.

Workflow
PLs move between statuses via Kanban interactions and API updates.

Consolidations
Group PLs and synchronize status across grouped shipments.

Calculator
Tracks logistics costs via leg1 and leg2 fields stored in PL.
