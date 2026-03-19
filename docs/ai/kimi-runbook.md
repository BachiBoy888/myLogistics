# Kimi Runbook — MyLogistics (Updated)

## Purpose

Operational guide for running AI agents (e.g., Kimi/OpenClaw) on the MyLogistics codebase.

Focus:
- safe execution
- investigation-first workflow
- backend-driven architecture
- explicit conversion logic

---

## Before You Start

Agent MUST read:

- mylogistics_ai_context.md
- system-map.md
- tech-context.md
- current-product-state.md
- prompt-template.md
- coding-rules.md
- qa-checklist.md

---

## Core Principles

1. Backend = source of truth
2. No implicit logic
3. No silent mutations
4. All critical flows must be explicit
5. Multi-step operations must be transactional

---

## Critical Domain: Lead Conversion

### Non-negotiable rules

- MUST NOT auto-link client
- MUST require explicit clientResolution
- MUST use transaction
- MUST lock lead (FOR UPDATE)
- MUST prevent double conversion
- MUST avoid orphan data

---

## Standard Agent Workflow

### Step 1 — Investigation (MANDATORY)

- Identify relevant files
- Read existing implementation
- Trace data flow
- Understand current behavior
- Identify risks:
  - transaction boundaries
  - concurrency issues
  - data integrity

Output:
- current behavior summary
- exact change points

---

### Step 2 — Planning

- propose minimal changes
- define affected files
- define validation logic
- define edge cases
- define Acceptance Criteria

---

### Step 3 — Implementation

- make small, safe changes
- preserve existing flows
- avoid side effects
- keep logic explicit

---

### Step 4 — Verification

- run tests
- simulate edge cases
- check logs
- confirm no regressions

---

## Phone Matching Rules

- MUST use normalization helper
- Canonical: 996XXXXXXXXX
- Invalid → null

Matching:
- suggestion only
- NEVER used for automatic linking

Performance:
- NO full-table scan
- use variant-based queries

---

## API Rules

Preview endpoint:
- read-only
- always returns 200

Convert endpoint:
- mutation
- requires explicit input
- must be transactional

---

## Legacy Handling

If legacy behavior exists:

- must log DEPRECATED_CONVERSION
- must be temporary
- must have removal plan

---

## Common Mistakes to Avoid

- adding auto-matching logic
- skipping transaction
- missing row lock
- partial writes
- frontend-based decisions
- hidden fallbacks

---

## Acceptance Criteria (MANDATORY)

Every task must include:

- correctness
- no regressions
- transaction safety
- concurrency safety
- explicit behavior

---

## Definition of Done

Task is complete ONLY if:

- all Acceptance Criteria satisfied
- no architectural violations
- no implicit logic introduced
- system remains stable

---

## Escalation Rules

If unsure:

- do NOT guess
- do NOT invent logic
- ask or re-investigate

---

## Summary

Agent must act as:

- careful engineer
- system guardian
- not code generator

Priority:

correctness > speed > convenience
