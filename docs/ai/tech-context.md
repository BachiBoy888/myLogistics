# TECH CONTEXT — MYLOGISTICS (FINAL)

This document explains the technical architecture of the myLogistics system.

It provides the minimum required technical context for developers and AI coding agents.

Goals:
- explain system architecture
- explain technical responsibilities by layer
- describe core data and request flow principles
- document critical backend-controlled workflows
- prevent architectural mistakes

This is a technical baseline document.
If code and this document disagree, code is the source of truth.

---

# SYSTEM OVERVIEW

MyLogistics is a logistics operations system managing the lifecycle:

Lead → Client → PL → Consolidation → Delivery

The system supports:

- lead intake
- client resolution
- packing lists (PL)
- consolidations
- logistics workflow stages
- documents
- comments and timeline events

The architecture is split into:

- Frontend (UI layer)
- Backend (business logic layer)
- Database (persistent canonical state)
- File storage (uploaded documents)

---

# TECH STACK

## Frontend
- React
- Vite
- TailwindCSS

## Backend
- Fastify

## Database
- PostgreSQL
- Drizzle ORM

## Deployment
- GitHub
- GitHub Actions
- Render

---

# CORE ARCHITECTURE PRINCIPLE

Backend is the SINGLE SOURCE OF TRUTH.

Frontend must never simulate final system state.

All business logic must live on the backend.

Frontend is responsible for:

- rendering UI
- sending user actions
- displaying backend responses
- refreshing state after mutations

Backend is responsible for:

- validation
- business rules
- state transitions
- transactions
- consistency guarantees

Database stores canonical system state.

---

# FRONTEND ARCHITECTURE

Frontend responsibilities:

- display leads, PLs, consolidations, documents
- provide Kanban and detail views
- collect user input
- call backend APIs
- re-render backend-confirmed state

Frontend communicates with backend via REST API.

Frontend MUST NOT:

- implement business logic
- resolve client identity
- simulate backend decisions
- mutate local state as source of truth
- hide backend inconsistencies

After mutations, frontend must refresh state from backend.

Example pattern:

await refreshCons()
await refreshPLs()

---

# BACKEND ARCHITECTURE

Backend provides:

- REST API endpoints
- validation
- business logic
- transaction handling
- file handling
- workflow enforcement

Backend must ensure:

- data integrity
- deterministic behavior
- consistent state transitions
- safe multi-step mutations
- correct ownership linkage

Backend-controlled workflows are preferred over implicit frontend logic.

---

# DATABASE ARCHITECTURE

Database: PostgreSQL  
ORM: Drizzle ORM

The database stores canonical system state.

All state transitions must be validated through backend logic.

Core entities include:

- leads
- clients
- pl
- consolidations
- consolidationPl
- plDocuments
- plComments
- plEvents
- status/history tables

---

# CORE TECHNICAL DOMAIN ENTITIES

## Lead
Incoming request before cargo becomes operational.

## Client
Canonical cargo owner.

## PL
Primary shipment entity.

## Consolidation
Grouped shipment containing multiple PLs.

## Document
PL-attached operational file.

## Comment / Event
Operational history and coordination layer.

---

# STATUS PIPELINE

Typical PL logistics stages:

- draft
- awaiting_docs
- awaiting_load
- to_load
- to_customs
- released
- kg_customs
- collect_payment
- closed

Kanban UI visualizes these stages.

Status transitions must be validated by backend.

Consolidation-driven movements may require synchronized PL updates.

---

# KANBAN ARCHITECTURE

Kanban board visualizes cargo workflow.

Each column represents a status stage.

Moving items in Kanban triggers backend updates.

Typical consolidation flow:

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

Important:
Kanban is only a UI interaction layer.
Final state is always backend-confirmed state.

---

# NETWORK PRINCIPLE

Frontend must avoid unnecessary API calls.

Examples of important expectations:

- opening cargo card should be a controlled request flow
- tabs should not cause unnecessary extra requests
- N+1 request patterns must be avoided

Frontend should prefer fetching complete backend payloads where architecture requires it.

---

# TRANSACTION PRINCIPLE

Operations affecting multiple tables must run inside a transaction.

Example cases:

- consolidation status update + PL sync + history insert
- lead conversion + client creation + PL creation + lead update
- document metadata + status history update

This prevents partially updated system states.

---

# NEW CRITICAL TECHNICAL DOMAIN — LEAD CONVERSION

Lead → Client → PL conversion is now a critical backend-controlled workflow.

This is NOT simple CRUD.

It is a multi-step transactional operation with identity, ownership, and concurrency risk.

---

# LEAD CONVERSION PRINCIPLES

## 1. No Implicit Resolution

Backend MUST NOT:

- auto-link client by name
- auto-link client by phone
- guess ownership

Backend MUST:

- require explicit clientResolution input
- treat phone matching only as suggestion logic

---

## 2. Explicit Conversion Contract

Critical endpoint:

POST /api/leads/:id/convert-to-pl

Expected modes:

- existing → use provided clientId
- new → create new client

No automatic final decision is allowed.

---

## 3. Preview vs Mutation Separation

Preview endpoint:
- read-only
- used for operator decision support

Convert endpoint:
- mutation
- performs validated, explicit conversion

This separation is mandatory.

---

# TRANSACTION MODEL — LEAD CONVERSION

Lead conversion must be atomic.

Inside one DB transaction:

1. SELECT lead FOR UPDATE
2. verify not already converted
3. resolve client explicitly
4. create PL
5. update lead
6. commit

Failure at any step:
→ full rollback

Guarantees:

- no duplicate PLs
- no orphan clients
- no partial updates

---

# CONCURRENCY PROTECTION

Main risk:
two requests attempt to convert the same lead.

Protection:
- row-level locking (FOR UPDATE)
- re-check conversion state inside transaction

Guarantee:
- only one successful conversion per lead

---

# PHONE NORMALIZATION (MVP)

Implemented as runtime helper.

No DB schema change required for MVP.

Canonical target format:

996XXXXXXXXX

Rules:
- strip non-digits
- normalize KG-compatible phone formats
- invalid phone → null

Used for:
- preview suggestions
- temporary legacy fallback (if still enabled)

Not used for:
- automatic final resolution
- forced data rewriting of raw stored value

---

# PHONE MATCHING STRATEGY

Phone matching must be bounded and predictable.

MVP strategy:
1. normalize lead phone
2. generate small set of valid variants
3. query DB using bounded conditions (e.g. IN / limited candidate set)

MUST NOT:
- full scan clients table
- silently choose a client from match results

---

# API STRUCTURE (HIGH LEVEL)

## Leads
- preview conversion
- execute conversion

## PL
- CRUD
- document handling
- comments/events
- calculator-related fields
- consolidation linkage

## Consolidations
- CRUD
- PL assignment
- status movement
- expense handling

## Documents
- upload
- list
- preview
- download
- status updates

---

# PROJECT STRUCTURE

Typical repository structure:

/src
  frontend React application

/server
  backend Fastify application

/server/routes
  API routes

/server/db
  database schema and DB logic

/server/services
  backend services

/server/lib
  helpers and low-level technical utilities

/server/scripts
  operational scripts

/docs/ai
  AI-agent documentation

---

# IMPORTANT TECHNICAL RULES

## Frontend must not:
- introduce N+1 API calls
- mutate local state as source of truth
- duplicate backend business logic
- perform hidden fallback logic

## Backend must:
- validate all critical inputs
- enforce workflow rules
- preserve consistency
- use transactions for multi-entity updates
- keep identity resolution explicit where required

## Database must:
- remain consistent
- never enter partially updated state
- support canonical state retrieval

---

# FUTURE TECHNICAL EVOLUTION

Possible next steps:

- phone_normalized column
- indexed normalized lookup
- client deduplication tooling
- controlled fuzzy matching
- stronger audit logging for conversion
- clearer domain-specific service boundaries

---

# PURPOSE OF THIS DOCUMENT

This document provides the baseline technical understanding required before modifying the system.

Developers and AI agents must read this document before:

- changing architecture
- implementing backend workflows
- modifying frontend request behavior
- introducing new data mutation logic

It is a technical context baseline, not a substitute for code inspection.
