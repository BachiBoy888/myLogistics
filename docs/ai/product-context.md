# PRODUCT CONTEXT — MYLOGISTICS (FINAL)

This document defines the business context, product logic, and core principles of the myLogistics system.

It is intended for developers and AI coding agents.

This is a PRODUCT-LEVEL document.
It explains how the system MUST behave and WHY.

---

# PRODUCT OVERVIEW

MyLogistics is a logistics operations platform used to manage cargo shipments from initial customer request to final delivery.

The system covers the full lifecycle:

Lead → Client → PL → Consolidation → Delivery

The platform helps teams manage:

- incoming customer requests (leads)
- client identity
- cargo shipments (PL)
- shipment consolidations
- operational documents
- logistics workflow stages
- comments and operational coordination

---

# CORE PRODUCT PHILOSOPHY

❗ Correctness > Automation

The system MUST prioritize data correctness over convenience.

Critical risks:

- incorrect client linkage
- mixed ownership of cargo
- financial inconsistencies
- broken shipment tracking

Therefore:

- NO implicit decisions
- NO automatic client linking
- NO hidden system behavior
- ALL critical actions must be explicit

System may assist users, but MUST NOT decide for them.

---

# SYSTEM BOUNDARIES

Backend is the SINGLE SOURCE OF TRUTH.

Frontend MUST NOT:

- mutate core data without backend confirmation
- perform optimistic updates for critical operations
- infer business decisions
- hide backend inconsistencies

All state transitions must be validated by backend.

---

# MAIN USERS

- Logistics Operators — manage cargo and statuses
- Operations Managers — manage consolidations and capacity
- Document Specialists — verify documents
- Warehouse Coordinators — track readiness for shipment

---

# CORE BUSINESS ENTITIES

## Lead (NEW)

Lead = incoming request before it becomes operational cargo.

Sources:

- website form
- WhatsApp / phone
- sales input
- manual entry

Lead is NOT yet a confirmed client.

---

## Client

Client is the TRUE owner of cargo.

Rules:

- every PL MUST belong to a client
- client identity MUST be correct
- duplicate clients are ACCEPTABLE (MVP)
- incorrect linking is NOT acceptable

---

## Packing List (PL)

PL is the main operational unit.

Represents:

- a cargo shipment
- financial calculation base
- logistics tracking entity

Typical attributes:

- client
- cargo name
- weight
- volume
- number of places
- status
- attached documents

PL can only be created AFTER client is explicitly determined.

---

## Consolidation

Consolidation groups multiple PLs into one shipment.

Used for:

- container optimization
- shared transport cost
- unified shipment tracking

Attributes:

- status
- capacity limits
- list of PLs
- operational expenses

---

## Documents

Documents are CRITICAL for logistics operations.

Two types:

### Required documents

Mandatory for shipment processing:

- invoice
- packing list
- inspection report
- customs pre-declaration

### Additional documents

Optional:

- photos
- contracts
- notes
- internal files

Shipment MUST NOT proceed without required documents (where applicable).

---

# CRITICAL PRODUCT FLOWS

## 1. Lead → Client → PL (CRITICAL FLOW)

This is the MOST sensitive part of the system.

### Old behavior (REMOVED)

- auto-matching client by phone
- implicit client reuse

Result:
- data corruption
- mixed clients
- hard-to-debug issues

---

### New behavior (MANDATORY)

User MUST explicitly choose:

1. Select existing client
2. Create new client

System may provide:

- phone-based suggestions
- possible matches

BUT:

- system NEVER auto-selects client
- system NEVER auto-links entities

---

## Phone Matching

Phone is used ONLY as a hint.

Phones may exist in different formats:

- 0220447446
- +996220447446
- 996220447446
- 220447446

System normalizes phone values for comparison.

BUT:

- matching is NOT reliable
- MUST NOT be used for automatic decisions

---

## 2. PL Lifecycle (Logistics Workflow)

Cargo moves through real-world logistics stages:

- draft
- awaiting_docs
- awaiting_load
- to_load
- to_customs
- released
- kg_customs
- collect_payment
- closed

These stages represent:

- cargo creation
- document collection
- warehouse preparation
- export
- customs processing
- delivery and payment

---

## 3. Consolidation Synchronization (CRITICAL RULE)

When a consolidation changes status:

→ ALL PLs inside MUST reflect consistent stage

System MUST ensure:

- no divergence between PL and consolidation
- consistent shipment tracking

---

# KANBAN WORKFLOW (UI MODEL)

Main interface: Kanban board.

- each column = logistics stage
- each card = PL

User action:

Drag PL → new column

System flow:

User action  
↓  
Frontend sends request  
↓  
Backend validates transition  
↓  
Database updates status  
↓  
Frontend refreshes state

Frontend MUST NOT:

- assume success
- update state without backend confirmation

---

# DOCUMENT MANAGEMENT RULES

- required documents must be visible
- missing documents must block progress where needed
- documents must be linked to correct PL
- document status must be transparent to user

---

# COMMENTS AND EVENTS

Users can add comments to PL:

Used for:

- issue tracking
- coordination
- operational notes

System tracks events:

- status changes
- document uploads
- consolidation updates
- comments

---

# UX PRINCIPLES

- show suggestions, NOT decisions
- make critical actions explicit
- avoid hidden automation
- prefer clarity over speed
- prevent silent data corruption

---

# MVP TRADEOFFS

ACCEPTED:

- duplicate clients may exist
- imperfect phone matching
- manual resolution of ambiguity

NOT ACCEPTED:

- incorrect client linkage
- silent system decisions
- hidden data mutations

---

# FUTURE EVOLUTION (PHASE 2+)

- client deduplication / merge
- stronger identity model (email, company ID)
- DB-level phone normalization
- smart suggestions (AI/heuristics)
- automation AFTER explicit confirmation

---

# FINAL PRODUCT MISSION

The system is not just moving cargo.

It manages:

- ownership
- responsibility
- financial accountability
- operational correctness

Therefore:

❗ Explicitness > Convenience  
❗ Correctness > Speed  
❗ Transparency > Automation

---

# PURPOSE OF THIS DOCUMENT

This file defines how the system MUST behave.

All developers and AI agents MUST follow this logic when:

- implementing features
- modifying flows
- designing UX
- writing backend logic

Violating these principles will lead to:

- data corruption
- broken logistics processes
- financial risk
