# Current Product State — MyLogistics (Updated)

## Overview

System supports logistics workflow for cargo (PL), consolidations, and now **lead → client → PL conversion**.

Backend is the single source of truth.

---

## Core Domain Entities

### Lead
- Represents incoming customer request / potential cargo
- Fields:
  - id
  - name
  - phone
  - company
  - email
  - status
  - clientId (nullable)
  - convertedPlId (nullable)

### Client
- Represents actual customer entity
- Used as owner of PL

### PL (Packing List)
- Main operational unit
- Always belongs to a client

### Consolidation
- Groups multiple PLs

---

## Lead → Client → PL Flow

### Key Principle

❗ Client MUST be selected explicitly during conversion  
❗ No automatic matching by name or phone in final conversion

---

## Lead Conversion Flow

### 1. Preview (read-only)

GET /api/leads/:id/convert-preview

Returns:
- lead data
- existing linked client (if any)
- exact phone matches (array)
- flags:
  - isAlreadyConverted
  - hasExistingClientLink
- proposedNewClient

Rules:
- Always returns 200
- No mutations
- No errors for already converted leads

---

### 2. Final Conversion

POST /api/leads/:id/convert-to-pl

Request:

mode = "existing" | "new"

Behavior:

- mode="existing":
  → use selected client

- mode="new":
  → ALWAYS create new client  
  → NEVER reuse existing even if phone matches

---

## Phone Normalization (MVP)

Used ONLY for matching, not storage.

Canonical format:
996XXXXXXXXX

Examples:
- 0220447446 → 996220447446
- +996220447446 → 996220447446
- 996220447446 → 996220447446
- 220447446 → 996220447446

Rules:
- remove non-digits
- apply KG normalization
- invalid → null

If normalization fails:
- no phone matches returned

---

## Exact Phone Matching

- Based on normalized equality
- Returns array (0..N)
- Never assumes uniqueness

⚠️ Matching is for suggestion ONLY  
⚠️ Never used for automatic linking in final conversion

---

## Transaction & Concurrency

Conversion MUST be atomic:

Inside single transaction:
1. lock lead (SELECT FOR UPDATE)
2. check not converted
3. resolve client
4. create PL
5. update lead

Guarantees:
- no duplicate PLs
- no orphan clients
- no partial state

---

## Legacy Behavior (Temporary)

If clientResolution is missing:
- fallback to old auto-resolution
- uses normalized phone matching
- logs DEPRECATED_CONVERSION

This path will be removed.

---

## Status Models

### Lead Status
- new
- in_progress
- qualified
- converted

### PL Status
- draft
- awaiting_docs
- awaiting_load
- in_transit
- arrived
- closed

### Consolidation Status
- draft
- loaded
- in_transit
- delivered

---

## Key Rules

- Backend is source of truth
- No implicit client resolution
- Conversion requires explicit decision
- Matching is suggestion, not logic
- All conversions are transaction-safe
