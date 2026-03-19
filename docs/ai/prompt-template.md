# AI AGENT PROMPT TEMPLATE — MYLOGISTICS (FINAL)

This template is MANDATORY for all AI agents working on MyLogistics.

Goal:
- deterministic engineering execution
- zero hallucination tolerance
- backend-driven architecture
- explicit product behavior
- safe and verifiable changes

---

# TASK

Clearly define the objective.

Include:
- what must be done
- expected result
- constraints

Examples:
- implement feature
- investigate bug
- refactor logic
- extend API

---

# PRODUCT CONTEXT (MANDATORY)

System: MyLogistics

Core flow:
Lead → Client → PL → Consolidation → Delivery

Critical principles:

- Correctness > Automation
- NO implicit decisions
- NO auto client linking
- Backend = single source of truth

Critical domains:

- Lead conversion (explicit client resolution)
- PL lifecycle (logistics stages)
- Consolidation synchronization
- Document completeness

---

# PROJECT CONTEXT

Frontend:
- React + Vite + Tailwind

Backend:
- Fastify + Drizzle ORM + PostgreSQL

Deployment:
- GitHub PR
- CI (GitHub Actions)
- Render preview

Workflow:
1. Create branch
2. Implement changes
3. Open PR
4. CI must pass
5. Preview deployment
6. Manual verification
7. Merge

---

# ARCHITECTURE RULES (STRICT)

Backend MUST:
- own all business logic
- validate all mutations
- ensure consistency
- use transactions when needed

Frontend MUST NOT:
- simulate backend state
- perform business logic
- mutate state as source of truth
- hide backend inconsistencies
- introduce N+1 calls

After ANY mutation:
→ MUST reload data from backend

---

# INVESTIGATION FIRST (MANDATORY)

You MUST NOT start implementation without investigation.

Steps:

1. Identify relevant files
2. Trace exact code path
3. Reproduce behavior
4. Identify root cause
5. Confirm root cause

If root cause is NOT confirmed:
→ DO NOT IMPLEMENT

---

# IMPLEMENTATION RULES

- minimal, targeted changes only
- preserve existing behavior
- no hidden logic
- no architectural violations

Transactions REQUIRED when:
- multiple entities affected
- critical state changes occur

---

# DOMAIN RULES (CRITICAL)

## Lead → Client → PL

- MUST require explicit client selection
- MUST NOT auto-match client
- MUST use transaction
- MUST prevent double conversion
- MUST avoid orphan data

## Phone Matching

- normalization required
- used ONLY for suggestions
- NEVER for automatic decisions

## Consolidation

- PL state MUST stay consistent with consolidation
- NO divergence allowed

---

# OUTPUT FORMAT (STRICT)

Agent MUST return:

1. Exact Code Path  
(full chain of execution)

2. Current Behavior  
(what system does now)

3. Root Cause  
(technical explanation)

4. Is It Bug or Intended Behavior  

5. Proposed Fix  
(with reasoning)

6. Files Changed  

7. Exact Code Changes  

8. Updated Backend Flow  

9. Risks  

10. Commit Hash  

11. CI Status  

12. Preview Deployment Status  

13. Verification Steps  

---

# ACCEPTANCE CRITERIA (MANDATORY)

ALL must be satisfied:

- [ ] feature works as expected
- [ ] no regressions
- [ ] backend remains source of truth
- [ ] no implicit logic introduced
- [ ] no duplicate or corrupted data
- [ ] transactions ensure consistency
- [ ] edge cases handled
- [ ] no extra API calls introduced
- [ ] system builds successfully
- [ ] backend starts successfully

---

# VERIFICATION

You MUST verify:

- API behavior
- UI behavior
- edge cases
- logs (no errors)
- data integrity

---

# COMPLETION GATE (STRICT)

You MUST NOT claim completion unless ALL conditions are met:

1. Code parses
2. Build passes (or explicitly UNVERIFIED)
3. Backend starts
4. Routes registered
5. CI is green OR marked UNVERIFIED
6. No unverified assumptions

If something is not verified:

You MUST explicitly state:

Example:
Build: UNVERIFIED  
CI: UNVERIFIED  

---

# SEPARATION OF MODES

## INVESTIGATION MODE

- analyze only
- NO code changes

## IMPLEMENTATION MODE

Only allowed AFTER:

- architecture constraints confirmed
- root cause confirmed

---

# FINAL RULE

If issue cannot be reproduced:
→ DO NOT IMPLEMENT FIX

If behavior is unclear:
→ ASK or INVESTIGATE MORE

---

# STYLE

- be precise
- be technical
- no assumptions
- no overengineering
- explain reasoning clearly
