# TECH CONTEXT — MYLOGISTICS

This document explains the technical architecture of the myLogistics system.
It provides the minimum required technical context for developers and AI coding agents.

The goal of this document is to:

- explain system architecture
- explain data flow
- describe project structure
- prevent architectural mistakes by contributors and AI agents


---------------------------------------------------------------------
SYSTEM OVERVIEW

myLogistics is a logistics operations system used to manage:

- cargo
- packing lists (PL)
- consolidations
- logistics workflow stages
- operational documents

The system is designed with a clear separation between:

Frontend (UI layer)
Backend (business logic)
Database (persistent state)


---------------------------------------------------------------------
TECH STACK

Frontend
- React
- Vite
- TailwindCSS

Backend
- Fastify

Database
- PostgreSQL
- Drizzle ORM

Deployment
- GitHub (source control)
- GitHub Actions (CI)
- Render (preview deployments)


---------------------------------------------------------------------
ARCHITECTURE PRINCIPLE

Backend is the SINGLE SOURCE OF TRUTH.

Frontend must never simulate system state.

All business logic must exist on the backend.

Frontend is responsible only for:

- rendering UI
- sending user actions
- displaying backend responses


---------------------------------------------------------------------
FRONTEND ARCHITECTURE

Main responsibilities:

- display cargo data
- display PL details
- display consolidations
- allow users to perform actions
- visualize logistics workflow

Frontend communicates with backend via REST API.

Frontend must always refresh state from backend after mutations.

Example:

await refreshCons()
await refreshPLs()


---------------------------------------------------------------------
BACKEND ARCHITECTURE

Backend provides:

- REST API endpoints
- validation
- business logic
- database operations
- transaction management

Backend must ensure:

- data integrity
- consistent state
- validation of user actions
- enforcement of workflow rules


---------------------------------------------------------------------
DATABASE ARCHITECTURE

Database: PostgreSQL

ORM: Drizzle ORM

Core entities include:

Packing List (PL)
Consolidation
Status History
Documents

The database stores canonical state of the system.

All state transitions must be validated through backend logic.


---------------------------------------------------------------------
CORE DOMAIN ENTITIES

Packing List (PL)

Represents cargo information.

Typical fields:

- id
- status
- client
- weight
- volume
- consolidationId (optional)


Consolidation

Represents a grouped shipment.

Typical fields:

- id
- status
- capacityKg
- capacityCbm
- machineCost


consolidation_pl

Join table connecting:

Consolidation ↔ Packing List


---------------------------------------------------------------------
STATUS PIPELINE

Cargo moves through the following logistics stages:

draft
awaiting_docs
awaiting_load
to_load
to_customs
released
kg_customs
collect_payment
closed

Kanban UI visualizes these stages.

Status transitions must be validated by backend.


---------------------------------------------------------------------
KANBAN ARCHITECTURE

Kanban board is used to visualize cargo workflow.

Each column represents a status stage.

Moving items in Kanban triggers backend updates.

Example flow:

User drags consolidation
↓
Frontend sends request
↓
PATCH /api/consolidations/:id
↓
Backend updates consolidation
↓
Backend synchronizes PL statuses
↓
Database transaction commits


---------------------------------------------------------------------
NETWORK PRINCIPLE

Frontend must avoid unnecessary API calls.

Opening cargo card must trigger exactly:

GET /api/pl/:id

Tabs must not trigger additional requests unless explicitly required.


---------------------------------------------------------------------
TRANSACTION PRINCIPLE

Operations affecting multiple tables must run inside a transaction.

Example:

db.transaction(async (tx) => {

update consolidation

update pl

insert status history

})

This prevents partially updated system states.


---------------------------------------------------------------------
PROJECT STRUCTURE

Typical repository structure:

/src
  React frontend components

/server
  Fastify backend

/server/routes
  API routes

/server/db
  database schema

/server/scripts
  operational scripts

/docs/ai
  AI agent documentation


---------------------------------------------------------------------
IMPORTANT ARCHITECTURE RULES

Frontend must not:

- introduce N+1 API calls
- mutate local state as source of truth
- duplicate backend logic

Backend must:

- validate state transitions
- maintain consistent system state
- enforce business rules

Database must:

- remain consistent
- never enter partially updated state


---------------------------------------------------------------------
PURPOSE OF THIS DOCUMENT

This document provides the baseline technical understanding required
before modifying the system.

Contributors and AI agents must read this document before implementing changes.
