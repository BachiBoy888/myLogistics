# CODING RULES — MYLOGISTICS (FINAL)

This document defines mandatory engineering rules for contributors and AI coding agents working on the MyLogistics project.

Its purpose is to:

- protect system architecture
- prevent regressions
- enforce backend-driven state
- prevent frontend workarounds
- enforce safe database operations
- protect identity-sensitive workflows

These rules are mandatory.

If code and these rules appear to conflict, investigate first before changing behavior.

---

# 1. CORE PRINCIPLE

Backend is the SINGLE SOURCE OF TRUTH.

Frontend must never simulate, fabricate, or finalize system state.

All business logic must live in the backend.

Frontend may assist user interaction, but must not decide business outcomes.

---

# 2. FRONTEND RULES

Frontend MUST NOT:

- perform N+1 API calls
- treat local arrays or derived UI state as the source of truth
- mutate UI state after backend mutations without refresh
- implement business logic that belongs in backend
- introduce workarounds for backend inconsistencies
- make hidden decisions on behalf of the user
- silently resolve entity linkage

After any mutation, frontend must reload state from backend.

Example pattern:

await refreshCons()
await refreshPLs()

Frontend must always render backend-confirmed state.

---

# 3. NETWORK RULES

Opening a cargo card must trigger a controlled request flow centered on:

GET /api/pl/:id

Tabs must NOT trigger additional API calls unless explicitly required by backend design.

Frontend must avoid:

- duplicate parallel requests
- repeated fetches for the same resource
- request patterns that create hidden N+1 behavior

---

# 4. BACKEND RULES

Backend owns all business logic.

Backend endpoints must:

- validate input
- enforce domain rules
- ensure database consistency
- return canonical state
- avoid ambiguous or silent business decisions

Backend routes must not depend on frontend assumptions.

Critical workflows must remain backend-controlled.

---

# 5. IDENTITY / CONVERSION RULES

For lead → client → PL conversion and other identity-sensitive flows:

Backend MUST NOT:

- auto-link client by phone
- auto-link client by name
- guess ownership implicitly

Backend MUST:

- require explicit resolution for final identity decisions
- treat matching results as suggestions only
- preserve correctness over convenience

Phone match is not proof of identity.

Duplicate clients are safer than incorrect client linkage.

---

# 6. DATABASE / TRANSACTION RULES

Any operation that modifies multiple related tables MUST run inside a database transaction.

Examples:

- consolidation update + PL sync + history insert
- lead conversion + client creation/use + PL creation + lead update
- document update + status history write

The system must never leave the database in a partially updated state.

---

# 7. CONCURRENCY RULES

When a workflow can be triggered multiple times concurrently, backend must protect against duplicate or conflicting writes.

For critical conversion flows:

- lock the primary record when needed (FOR UPDATE or equivalent)
- re-check state inside the transaction
- ensure only one successful final write path

No critical flow may rely on “unlikely concurrency”.

---

# 8. MATCHING RULES

When phone matching or similar heuristics are used:

- use normalization helpers
- keep matching bounded and predictable
- do not scan entire tables without strong reason
- do not convert suggestion logic into final decision logic

Matching exists to assist review, not replace explicit confirmation.

---

# 9. MIGRATION SAFETY

Database schema changes must follow safe migration practices:

- migrations should be additive when possible
- destructive changes must be justified
- existing data must not be lost unintentionally
- migration scripts should be reversible when feasible
- transitional compatibility paths must be documented

---

# 10. ARCHITECTURE SAFETY

The following are prohibited unless explicitly justified and reviewed:

- duplicating backend business logic in frontend
- introducing silent state mutations
- bypassing backend validation
- adding new APIs without clear need
- breaking existing API contracts
- reintroducing implicit identity logic
- expanding temporary legacy fallback behavior

Existing features should be extended carefully, not duplicated blindly.

---

# 11. LEGACY / TRANSITION RULES

If a legacy compatibility path still exists:

- it must be treated as temporary
- it must not be expanded
- it must not silently become default behavior again
- new logic must be built on the explicit flow, not on the legacy fallback

---

# 12. INVESTIGATION-FIRST RULE

Bug fixing and sensitive refactoring must follow this sequence:

1. reproduce the issue or confirm current behavior
2. identify exact code path
3. identify root cause
4. confirm root cause
5. implement fix

If root cause cannot be confirmed:

DO NOT IMPLEMENT A FIX.

Guessing is prohibited.

---

# 13. ACCEPTANCE CRITERIA REQUIREMENT

All implementation prompts must include an Acceptance Criteria section.

Tasks without Acceptance Criteria must not be implemented.

This is mandatory.

---

# 14. COMPLETION HONESTY RULE

Do not claim a task is fully complete unless verification actually happened.

If build, startup, CI, or runtime behavior is not verified, it must be explicitly labeled:

UNVERIFIED

Premature success claims are prohibited.

---

# 15. FINAL RULE

If a problem cannot be reproduced and current behavior cannot be confirmed:

DO NOT IMPLEMENT A FIX.

Investigate further first.
