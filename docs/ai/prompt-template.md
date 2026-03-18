# AI AGENT PROMPT TEMPLATE — MYLOGISTICS

This template must be used when generating prompts for the coding AI agent.

The goal of this template is to:
- enforce deterministic engineering tasks
- prevent hallucinations
- enforce investigation-first workflow
- protect system architecture
- prevent frontend workarounds
- ensure backend remains the single source of truth

---------------------------------------------------------------------
TASK

Clear description of the engineering objective.

Describe exactly what must be achieved.

Examples:
- Implement new feature
- Investigate bug
- Refactor architecture
- Extend API
- Improve UX behavior without breaking architecture

---------------------------------------------------------------------
PROJECT CONTEXT

System: myLogistics

Frontend
- React
- Vite
- Tailwind
- Kanban UI

Backend
- Fastify
- Drizzle ORM
- PostgreSQL

Deployment
- GitHub Pull Requests
- GitHub Actions CI
- Render Preview Deployments

Development workflow:
1. Agent creates branch
2. Agent implements changes
3. Pull Request is opened
4. CI must pass
5. Render creates preview deployment
6. Manual testing
7. Merge to main

---------------------------------------------------------------------
ARCHITECTURE RULES

Backend is the SINGLE SOURCE OF TRUTH.

Frontend must NOT:
- perform N+1 API calls
- mutate arrays as the source of truth
- perform optimistic updates without backend refresh
- introduce workarounds for backend inconsistencies

After mutations UI must reload state from backend.

Example:

await refreshCons()
await refreshPLs()

Frontend must never simulate backend state.

All business logic must remain on backend.

Opening cargo card must trigger:

GET /api/pl/:id

Only ONE request.

Tabs must NOT trigger additional API calls unless explicitly required by backend.

---------------------------------------------------------------------
INVESTIGATION REQUIRED

The agent must NEVER guess.

Bug fixing must follow this order:
1. reproduce bug
2. identify exact code path
3. identify root cause
4. confirm root cause
5. implement fix

If root cause is not confirmed:

NO FIX.

---------------------------------------------------------------------
ISSUE LIST

List all problems or improvements clearly.

Example:

Issue 1
Description of the problem.

Issue 2
Description of improvement.

---------------------------------------------------------------------
IMPLEMENTATION RULES

The agent must respect the following engineering constraints.

DO NOT:
- introduce new endpoints without strong reason
- create frontend workarounds
- break existing architecture
- introduce N+1 API calls
- mutate frontend state as data source

Backend operations touching multiple tables MUST run in transaction.

Example:

db.transaction(async (tx) => {
  update consolidation
  update pl
  insert status history
})

Never leave system in partially updated state.

---------------------------------------------------------------------
FILES THAT MAY BE INVOLVED

Hints only.

Never assume.

Example:

Frontend
src/components/kanban/KanbanBoard.jsx
src/components/cargo/CargoView.jsx

Backend
server/routes/pl.js
server/routes/consolidations.js

Database
server/db/schema.js

---------------------------------------------------------------------
ACCEPTANCE CRITERIA

The task is considered successful only if ALL criteria are met.

Example:
- Feature works according to specification
- No additional API calls introduced
- Backend remains source of truth
- UI reloads state from backend
- No console errors
- CI passes
- Backend starts successfully
- All existing functionality remains intact

---------------------------------------------------------------------
VERIFICATION

Manual verification steps.

Example:

1. Open cargo card
2. Check Network tab
3. Confirm exactly one request:
GET /api/pl/:id

4. Verify no additional tab requests
5. Verify UI renders correctly
6. Verify backend logs contain no errors

---------------------------------------------------------------------
REQUIRED OUTPUT FORMAT

Agent must return investigation report in the following structure.

1. Exact Code Path

Example:

KanbanBoard.jsx handleDrop()
↓
onPLMove(...)
↓
CargoView.jsx handlePLMove()
↓
PATCH /api/consolidations/:id

2. Root Cause

Precise technical explanation.

3. Intentional Behavior or Bug

Clarify whether behavior was expected.

4. Files Changed

List files modified.

5. Exact Code Fix

Show relevant code modifications.

6. Updated Backend Flow

Explain new system behavior.

7. Commit Hash

8. CI Status

9. Preview Deployment Status

10. Verification Steps

---------------------------------------------------------------------
COMPLETION GATE

The agent must NOT claim task completion prematurely.

You may NOT say:
- completed
- ready
- working
- fixed
- pushed successfully
- done
- resolved

unless ALL of the following are true:

1. Code parses successfully
2. Project build passes (if applicable)
3. Backend startup check passes
4. Relevant route registration passes
5. CI status is green OR explicitly marked as "not yet verified"
6. Any unverified claim is clearly labeled as UNVERIFIED

If any condition is not satisfied:
The agent must explicitly state which condition is not yet verified.

Example:

Backend parse: OK
Build: UNVERIFIED
CI: UNVERIFIED

The agent must NOT claim completion.

---------------------------------------------------------------------
SEPARATION OF MODES

The agent must strictly separate investigation and implementation tasks.

INVESTIGATION MODE

If the task is investigation-only the agent must:
- read the code
- explain architecture
- identify code paths
- analyze behavior

The agent must NOT:
- modify files
- implement fixes
- claim work completed

IMPLEMENTATION MODE

If the task requires implementation the agent must:
1. summarize confirmed architecture constraints
2. confirm root cause
3. describe implementation plan
4. implement changes
5. verify build/startup
6. produce final report

If architecture constraints are not confirmed:
Implementation must NOT start.

---------------------------------------------------------------------
FINAL RULE

If the issue cannot be reproduced:

DO NOT IMPLEMENT A FIX.
