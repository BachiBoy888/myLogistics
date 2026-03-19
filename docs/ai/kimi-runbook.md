# KIMI CODING AGENT RUNBOOK — MYLOGISTICS (FINAL)

This runbook defines how an AI coding agent must operate inside the MyLogistics repository.

It is an operational execution guide.

Goals:
- ensure correct project understanding before changes
- prevent architectural regressions
- enforce investigation-first workflow
- enforce backend as the single source of truth
- prevent hallucinated implementations
- standardize task execution and reporting

If this runbook conflicts with direct code behavior, code is the source of truth.
If this runbook conflicts with product/tech rules, those rules must be re-checked before implementation continues.

---

# 1. REQUIRED READING ORDER

Before starting ANY task, the agent MUST read the following files in this order:

1. docs/ai/mylogistics_ai_context.md
2. docs/ai/product-context.md
3. docs/ai/tech-context.md
4. docs/ai/current-product-state.md
5. docs/ai/system-map.md
6. docs/ai/coding-rules.md
7. docs/ai/qa-checklist.md
8. docs/ai/prompt-template.md

The agent MUST NOT start implementation before reading these files.

---

# 2. PROJECT OVERVIEW

Project: MyLogistics

Purpose:
A logistics operations system managing the lifecycle:

Lead → Client → PL → Consolidation → Delivery

Main implemented areas include:

- lead intake and conversion
- client ownership
- PL management
- consolidation management
- document management
- Kanban workflow
- calculator-related fields
- comments, history, and operational events

---

# 3. TECH STACK

## Frontend
- React
- Vite
- Tailwind

## Backend
- Fastify

## Database
- PostgreSQL
- Drizzle ORM

## Deployment
- GitHub
- GitHub Actions CI
- Render preview deployments

---

# 4. CORE ENGINEERING PRINCIPLES

1. Backend is the SINGLE SOURCE OF TRUTH.

Frontend must never simulate final backend state.

2. All business logic must live on the backend.

3. Frontend must not introduce N+1 API calls.

4. Frontend must reload backend state after mutations.

Example pattern:

await refreshCons()
await refreshPLs()

5. Multi-table backend changes must run inside a transaction.

6. Critical flows must remain explicit.

7. The system must never enter partially updated states.

Atomic behavior is required for critical mutations.

---

# 5. CRITICAL DOMAIN RULES — LEAD CONVERSION

Lead → Client → PL conversion is a critical workflow.

Non-negotiable rules:

- MUST NOT auto-link client by phone
- MUST NOT auto-link client by name
- MUST require explicit client resolution
- MUST separate preview from mutation
- MUST use transaction
- MUST lock lead row when converting (FOR UPDATE or equivalent)
- MUST prevent double conversion
- MUST avoid orphan clients / orphan PLs
- MUST treat phone matching as suggestion-only

If legacy compatibility behavior still exists:
- it must be treated as temporary current behavior
- it must not be expanded
- it must not become the default design again

---

# 6. INVESTIGATION-FIRST WORKFLOW

The agent must always investigate before implementing.

Required order:

1. reproduce the problem or inspect current flow
2. locate exact code path
3. identify root cause / relevant existing behavior
4. confirm root cause or confirmed change point
5. only then implement

If root cause is not confirmed:
→ DO NOT IMPLEMENT A FIX

Guessing is prohibited.

---

# 7. TASK EXECUTION MODES

The agent must clearly distinguish between two task types.

## INVESTIGATION MODE

Used when the task is:
- research
- debugging
- architecture discovery
- codepath analysis

The agent MUST:
- read relevant code
- identify involved files
- map request/data flow
- explain current behavior
- identify risks and constraints

The agent MUST NOT:
- modify files
- propose unverified fixes as implemented
- claim completion of engineering work

---

## IMPLEMENTATION MODE

Used when the task requires code changes.

The agent MUST follow this order:

1. summarize confirmed architecture constraints
2. summarize confirmed current behavior
3. confirm root cause / exact change target
4. describe minimal implementation plan
5. implement changes
6. verify startup/build where applicable
7. verify affected behavior
8. produce final report

Implementation must NOT begin before constraints are confirmed.

---

# 8. PLANNING RULES

Before changing code, the agent must define:

- target behavior
- minimal set of affected files
- API / data impact
- transaction impact
- concurrency risks
- edge cases
- Acceptance Criteria

Tasks without Acceptance Criteria must not be implemented.

This rule is mandatory.

---

# 9. ARCHITECTURE SAFETY RULES

The agent MUST NOT:

- break existing API contracts without explicit reason
- add hidden state logic in frontend
- duplicate backend business logic in frontend
- introduce silent data mutations
- introduce N+1 API patterns
- add convenience logic that weakens identity correctness
- widen legacy fallback behavior

Frontend must always rely on backend responses for final state.

Existing features should be extended carefully, not duplicated blindly.

---

# 10. PHONE MATCHING RULES

When task touches phone matching:

- use normalization helper
- canonical target format: 996XXXXXXXXX
- invalid phone → null

Matching rules:
- suggestion only
- never final identity decision
- never assume uniqueness from phone alone

Performance rules:
- no full-table scan
- use bounded variants / constrained query strategy

---

# 11. VERIFICATION RULES

After implementation, the agent MUST verify as applicable:

- backend parse
- backend startup
- route registration
- API behavior
- UI behavior
- edge cases
- logs / runtime errors
- regressions
- CI status
- preview deployment behavior

Use qa-checklist.md as mandatory verification baseline.

---

# 12. COMPLETION GATE

The agent MUST NOT claim task completion prematurely.

The agent may NOT say:

- completed
- fixed
- ready
- working
- pushed successfully
- resolved
- done

unless ALL of the following are satisfied:

1. code parses successfully
2. build passes (if applicable) OR marked UNVERIFIED
3. backend startup check passes OR marked UNVERIFIED
4. relevant route registration passes OR marked UNVERIFIED
5. verification steps are listed
6. CI status is green OR explicitly marked UNVERIFIED
7. any unverified claim is clearly labeled UNVERIFIED

If any item is not verified, the agent must explicitly say so.

Example:

Backend parse: OK  
Build: UNVERIFIED  
CI: UNVERIFIED  

The agent must not present the task as fully complete.

---

# 13. REQUIRED TASK REPORT FORMAT

Every task result must be returned in this structure:

1. Exact Code Path  
2. Current Behavior  
3. Root Cause  
4. Intentional Behavior or Bug  
5. Architecture Constraints  
6. Files Changed  
7. Exact Code Fix  
8. Updated Backend Flow  
9. Risks / Edge Cases  
10. Commit Hash  
11. CI Status  
12. Preview Deployment Status  
13. Verification Steps  

If the task is investigation-only:
- omit Files Changed / Commit Hash
- clearly state that no code was modified

---

# 14. COMMON FAILURE MODES TO AVOID

Do NOT:

- guess hidden logic
- implement before confirming flow
- add auto-matching
- skip transaction in multi-step write flow
- miss row lock in conversion
- leave partial writes
- move business logic into frontend
- hide compatibility behavior behind silent fallback
- claim verification you did not actually perform

---

# 15. FINAL RULE

If the issue cannot be reproduced:
→ DO NOT IMPLEMENT A FIX

If the architecture is unclear:
→ investigate further before coding

If current behavior differs from expected behavior:
→ report the difference explicitly before changing code

Priority order:

correctness > safety > clarity > speed > convenience
