# MyLogistics — README (Updated)

## Overview

MyLogistics is a logistics operations platform managing cargo flow from initial customer request to final delivery.

System now supports full lifecycle:

Lead → Client → PL → Consolidation → Delivery

---

## Core Modules

### Leads (CRM Intake)
- Capture incoming customer requests
- Store initial cargo and contact data
- Convert leads into operational cargo (PL)

### Clients
- Represent actual customers
- Own all cargo (PL)
- Must be explicitly selected during conversion

### PL (Packing List)
- Core operational entity
- Represents cargo unit
- Used for tracking, pricing, and shipment

### Consolidations
- Group multiple PLs into shipments
- Used for logistics optimization

### Documents
- Attach and manage cargo-related files

---

## Key Feature: Lead → PL Conversion

This is the most critical flow in the system.

### Principle

❗ Client MUST be explicitly selected  
❗ System MUST NOT auto-match or guess  

### Flow

1. Open lead
2. Call preview endpoint
3. See client suggestions (based on phone)
4. Choose:
   - existing client
   - create new client
5. Convert to PL

---

## Phone Matching

System supports multiple phone formats:

- 0220447446
- +996220447446
- 996220447446
- 220447446

All are normalized internally for matching.

⚠️ Matching is used only for suggestions  
⚠️ Never used for automatic linking

---

## Architecture

Frontend:
- React
- Vite
- Tailwind

Backend:
- Fastify
- Drizzle ORM
- PostgreSQL

---

## Backend Principles

- Backend is source of truth
- No hidden logic in frontend
- All critical operations are explicit
- Conversion is transaction-safe
- Concurrency is handled via row locking

---

## API Overview

### Leads
- GET /api/leads/:id/convert-preview
- POST /api/leads/:id/convert-to-pl

### PL
- CRUD operations
- document management
- consolidation linking

### Consolidations
- create and manage shipments

---

## Status Models

### Lead
- new
- in_progress
- qualified
- converted

### PL
- draft
- awaiting_docs
- awaiting_load
- in_transit
- arrived
- closed

### Consolidation
- draft
- loaded
- in_transit
- delivered

---

## Product Philosophy

The system prioritizes:

- correctness over automation
- explicit decisions over assumptions
- data integrity over convenience

---

## MVP Tradeoffs

Accepted:
- duplicate clients may exist
- phone matching is not perfect

Not accepted:
- incorrect client linkage
- silent system decisions

---

## Future Roadmap

- client deduplication
- phone normalization at DB level
- advanced matching signals
- audit logs for conversions

---

## Getting Started

1. Install dependencies
2. Setup environment variables
3. Run backend and frontend
4. Use leads flow to test conversion

---

## Summary

MyLogistics is evolving from a simple logistics tracker into a controlled operational system.

Key shift:

→ from implicit logic  
→ to explicit, safe workflows
