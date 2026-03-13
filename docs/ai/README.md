
# myLogistics

myLogistics is a logistics workflow system for managing cargo shipments, packing lists (PL), consolidations, documents, and operational workflows.

The system includes:

- PL management
- document management
- consolidation management
- Kanban workflow
- cargo calculator
- analytics snapshots


================================================
TECH STACK
================================================

Frontend
- React
- Vite
- Tailwind

Backend
- Fastify
- Drizzle ORM
- PostgreSQL

Storage
- Local file storage for documents

Deployment
- Render
- GitHub Actions CI


================================================
AI AGENT CONTEXT FILES
================================================

AI coding agents must read the following files before executing tasks:

docs/ai/product-context.md
docs/ai/tech-context.md
docs/ai/current-product-state.md
docs/ai/system-map.md
docs/ai/coding-rules.md
docs/ai/qa-checklist.md
docs/ai/prompt-template.md

These files provide:

- system architecture
- product state
- coding rules
- QA expectations
- navigation map of the system


================================================
PROJECT STRUCTURE (SIMPLIFIED)
================================================

frontend:
src/

backend:
server/

database:
server/db/

documents:
uploads/pl/

ai context:
docs/ai/
