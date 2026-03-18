# PRODUCT CONTEXT — MYLOGISTICS

This document explains the business context and product logic of the myLogistics system.
It is intended for developers and AI coding agents so they understand **why** the system exists
and how users interact with it.

This document focuses on **product behavior**, not low‑level technical implementation.


---------------------------------------------------------------------
PRODUCT PURPOSE

myLogistics is a logistics operations platform used to manage cargo shipments
between suppliers, warehouses, and destination countries.

The system helps logistics teams manage:

- cargo shipments
- packing lists (PL)
- shipment consolidations
- operational documents
- workflow stages of cargo movement
- comments and operational notes


---------------------------------------------------------------------
MAIN USERS

Primary users of the system are:

Logistics Operators
They manage cargo records and track shipment progress.

Operations Managers
They monitor consolidations and shipment capacity.

Document Specialists
They verify shipping documents such as invoices and packing lists.

Warehouse Coordinators
They track cargo readiness for loading.


---------------------------------------------------------------------
CORE BUSINESS OBJECTS


Packing List (PL)

A PL represents a **single cargo shipment** belonging to a client.

Typical attributes include:

- client
- cargo name
- weight
- volume
- number of places
- logistics status
- attached documents

PLs are the **central operational unit** in the system.


Consolidation

A consolidation groups multiple PLs into a single shipment.

This allows the logistics company to:

- combine cargo from different clients
- manage container capacity
- track shared shipment stages

A consolidation typically includes:

- shipment status
- capacity limits
- associated PLs
- operational expenses


Documents

Each PL may have associated documents.

Examples include:

- invoice
- packing list
- inspection reports
- customs pre‑declaration

Documents are required for logistics and customs operations.


---------------------------------------------------------------------
LOGISTICS WORKFLOW

Cargo moves through multiple operational stages.

Typical stages include:

draft
awaiting_docs
awaiting_load
to_load
to_customs
released
kg_customs
collect_payment
closed

These stages represent the real-world logistics process:

1. cargo created
2. documents collected
3. cargo prepared for loading
4. shipment exported
5. customs processing
6. delivery and payment completion

The Kanban board visualizes this workflow.


---------------------------------------------------------------------
KANBAN WORKFLOW

The main user interface is a **Kanban board**.

Each column represents a cargo stage.

Users move cargo cards between stages using drag‑and‑drop.

Example flow:

User drags a PL to a new stage
↓
Frontend sends update request
↓
Backend validates status transition
↓
Database updates cargo status
↓
Frontend refreshes state


---------------------------------------------------------------------
CONSOLIDATION LOGIC

Consolidations represent grouped shipments.

Benefits of consolidation:

- shared transport cost
- container optimization
- unified shipment tracking

When a consolidation changes status,
all PLs inside the consolidation typically move to the same stage.

This ensures consistent shipment tracking.


---------------------------------------------------------------------
DOCUMENT MANAGEMENT

Documents are critical for logistics operations.

Two main document categories exist:

Required documents
These are mandatory documents needed for shipment processing.

Examples:

- invoice
- packing list
- inspection report
- customs pre‑declaration

Additional documents
Users may upload extra files such as:

- photos
- contracts
- special instructions
- internal documents


---------------------------------------------------------------------
COMMENTS AND EVENTS

Operators can add comments to PL records.

These comments allow teams to:

- document issues
- leave operational notes
- coordinate between departments

Timeline events track system activity including:

- document uploads
- status changes
- consolidation updates
- comments


---------------------------------------------------------------------
BUSINESS GOAL OF THE SYSTEM

The goal of myLogistics is to:

- centralize cargo operations
- reduce manual tracking
- improve visibility of shipment progress
- ensure document completeness
- simplify logistics workflows

The system acts as the **operational control center**
for managing cargo shipments and logistics processes.


---------------------------------------------------------------------
IMPORTANT PRODUCT PRINCIPLES

The system must:

- reflect real logistics workflow
- maintain accurate cargo state
- ensure documents are properly attached
- allow operators to track shipment progress clearly
- keep consolidations and cargo status synchronized


---------------------------------------------------------------------
PURPOSE OF THIS DOCUMENT

This file provides **product-level understanding** of the system.

Developers and AI agents must understand this context before
making architectural or feature changes.
