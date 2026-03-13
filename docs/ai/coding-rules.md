# CODING RULES — MYLOGISTICS

This document defines mandatory engineering rules for contributors and AI coding agents working on the myLogistics project.

The purpose of these rules is to:
- protect system architecture
- prevent regressions
- enforce backend-driven state
- prevent frontend workarounds
- enforce safe database operations


---------------------------------------------------------------------
CORE PRINCIPLE

Backend is the SINGLE SOURCE OF TRUTH.

Frontend must never simulate or fabricate system state.

All business logic must live in the backend.


---------------------------------------------------------------------
FRONTEND RULES

Frontend must NOT:

- perform N+1 API calls
- treat local arrays as the source of truth
- mutate UI state after backend mutations without refresh
- implement business logic that belongs in backend
- introduce workarounds for backend inconsistencies

After any mutation the frontend must reload state from backend.

Example:

await refreshCons()
await refreshPLs()

Frontend must always render backend-confirmed state.


---------------------------------------------------------------------
NETWORK RULES

Opening a cargo card must trigger exactly one request:

GET /api/pl/:id

Tabs must NOT trigger additional API calls unless explicitly required by backend design.

The frontend must avoid patterns that cause multiple parallel requests for the same resource.


---------------------------------------------------------------------
BACKEND RULES

Backend must remain the source of all business logic.

Backend endpoints must:

- validate input
- enforce domain rules
- ensure database consistency
- return canonical state

Backend routes must not depend on frontend assumptions.


---------------------------------------------------------------------
DATABASE RULES

Any operation that modifies multiple related tables MUST run inside a database transaction.

Example:

db.transaction(async (tx) => {
  update consolidation
  update pl
  insert status history
})

The system must never leave the database in a partially updated state.


---------------------------------------------------------------------
MIGRATION SAFETY

Database schema changes must follow safe migration practices:

- migrations must be additive whenever possible
- destructive migrations must be justified
- existing data must not be lost
- migration scripts must be reversible when feasible


---------------------------------------------------------------------
ARCHITECTURE SAFETY

The following actions are strictly prohibited:

- duplicating backend business logic in frontend
- introducing silent state mutations
- bypassing backend validation
- introducing new APIs without clear need
- breaking existing API contracts


---------------------------------------------------------------------
INVESTIGATION-FIRST RULE

Bug fixing must follow this sequence:

1. reproduce the bug
2. identify exact code path
3. identify root cause
4. confirm root cause
5. implement fix

If root cause cannot be confirmed:

DO NOT IMPLEMENT A FIX.

Guessing is prohibited.


---------------------------------------------------------------------
SEPARATION OF MODES

AI agents must distinguish between investigation and implementation tasks.


INVESTIGATION MODE

Allowed actions:

- read code
- analyze architecture
- trace code paths
- explain behavior

Not allowed:

- modifying files
- implementing fixes
- claiming completion


IMPLEMENTATION MODE

Required order:

1. summarize architecture constraints
2. confirm root cause (if bug)
3. describe implementation plan
4. implement changes
5. verify backend startup/build
6. produce final report


---------------------------------------------------------------------
COMPLETION GATE

An agent may NOT claim a task is complete unless ALL conditions are met:

1. code parses successfully
2. project build passes (if applicable)
3. backend startup check passes
4. relevant route registration passes
5. CI status is green OR clearly marked UNVERIFIED
6. any unverified claim is explicitly labeled UNVERIFIED

Agents must never prematurely claim success.


---------------------------------------------------------------------
ACCEPTANCE CRITERIA REQUIREMENT

All implementation prompts must include an Acceptance Criteria section.

Tasks without Acceptance Criteria must not be implemented.


---------------------------------------------------------------------
FINAL RULE

If a problem cannot be reproduced:

DO NOT IMPLEMENT A FIX.
