# MyLogistics

MyLogistics is a logistics operations platform for managing cargo from initial customer request to final delivery.

Current lifecycle:

Lead → Client → PL → Consolidation → Delivery

The system is used to manage:

- lead intake
- client resolution
- packing lists (PL)
- consolidations
- documents
- Kanban workflow
- cargo calculation
- operational history and comments

---

## Core Principle

The system prioritizes:

- correctness over automation
- explicit decisions over assumptions
- data integrity over convenience

Critical rule:

- client identity must be resolved explicitly
- system must not silently auto-link clients

---

## Main Modules

### Leads
Incoming customer requests before cargo becomes operational.

### Clients
Canonical cargo owners.

### PL (Packing List)
Main operational cargo unit.

### Consolidations
Grouped shipments containing multiple PLs.

### Documents
Operational shipment files attached to PLs.

---

## Critical Flow

Lead → Client → PL conversion is the most sensitive workflow in the system.

High-level flow:

1. Open lead
2. Request conversion preview
3. Review client suggestions
4. Explicitly choose:
   - existing client
   - or create new client
5. Convert lead to PL

Important:
- phone matching is suggestion-only
- final conversion must be explicit

---

## Tech Stack

### Frontend
- React
- Vite
- Tailwind

### Backend
- Fastify

### Database
- PostgreSQL
- Drizzle ORM

### Storage
- Local file storage for documents

### Deployment
- GitHub
- GitHub Actions CI
- Render

---

## Project Structure

```text
src/            # frontend
server/         # backend
server/db/      # schema and DB layer
uploads/pl/     # document storage
docs/ai/        # AI agent context files
