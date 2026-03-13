# KIMI CODING AGENT RUNBOOK — MYLOGISTICS

This runbook defines how the AI coding agent must operate inside the myLogistics repository.

The goal of this document is to:

- ensure the agent understands the project before making changes
- prevent architectural regressions
- enforce investigation-first workflow
- enforce backend as the single source of truth
- prevent hallucinated implementations
- standardize how tasks are executed


---------------------------------------------------------------------
REQUIRED READING ORDER

Before starting ANY task the agent must read the following files in this order:

1. docs/ai/product-context.md
2. docs/ai/tech-context.md
3. docs/ai/current-product-state.md
4. docs/ai/coding-rules.md
5. docs/ai/qa-checklist.md
6. docs/ai/prompt-template.md

The agent must NOT start implementation before reading these files.


---------------------------------------------------------------------
PROJECT OVERVIEW

Project: myLogistics

Purpose:

A logistics management system used to manage cargo, packing lists (PL), and consolidations for shipments.

Main features include:

- cargo tracking
- packing list (PL) management
- consolidation management
- document management
- operational workflow between logistics stages


---------------------------------------------------------------------
TECH STACK

Frontend
- React
- Vite
- Tailwind

Backend
- Fastify

Database
- PostgreSQL
- Drizzle ORM

Deployment
- GitHub
- GitHub Actions CI
- Render preview deployments


---------------------------------------------------------------------
ENGINEERING PRINCIPLES

1. Backend is the SINGLE SOURCE OF TRUTH.

Frontend must never simulate backend state.

All business logic must live on the backend.

2. Frontend must not introduce N+1 API calls.

3. Frontend must reload state from backend after mutations.

Example:

await refreshCons()
await refreshPLs()

4. Backend changes affecting multiple tables must run inside a transaction.

Example:

db.transaction(async (tx) => {
  update consolidation
  update pl
  insert status history
})

5. The system must never enter partially updated states.

Atomic operations are required for critical mutations.


---------------------------------------------------------------------
INVESTIGATION-FIRST WORKFLOW

The agent must always investigate before implementing.

Required order:

1. reproduce the problem
2. locate exact code path
3. identify root cause
4. confirm root cause
5. implement fix

If root cause is not confirmed:

DO NOT IMPLEMENT A FIX.

Guessing is strictly prohibited.


---------------------------------------------------------------------
TASK EXECUTION MODES

The agent must clearly distinguish between two types of tasks.


INVESTIGATION MODE

Used when the task is research or debugging.

The agent must:

- read the relevant code
- map system architecture
- identify code paths
- explain current behavior

The agent must NOT:

- modify files
- implement changes
- claim work completed


IMPLEMENTATION MODE

Used when the task requires changes.

The agent must follow this order:

1. summarize confirmed architecture constraints
2. confirm root cause (if bug related)
3. describe implementation plan
4. implement changes
5. verify startup/build
6. produce final report

Implementation must never begin before architecture constraints are confirmed.


---------------------------------------------------------------------
ARCHITECTURE SAFETY RULES

The agent must not:

- break existing API contracts
- introduce hidden state logic in frontend
- duplicate backend business logic in frontend
- introduce silent data mutations
- introduce N+1 API calls

Frontend must always rely on backend responses for final state.

Existing features must be extended, not duplicated.


---------------------------------------------------------------------
DOCUMENTATION RULE

All prompts used for coding tasks must include an **Acceptance Criteria** section.

This rule is mandatory.

Tasks without Acceptance Criteria must not be implemented.


---------------------------------------------------------------------
COMPLETION GATE

The agent must NOT claim task completion prematurely.

The agent may NOT say:

- completed
- fixed
- ready
- working
- pushed successfully
- resolved

unless ALL of the following conditions are satisfied:

1. code parses successfully
2. project build passes (if applicable)
3. backend startup check passes
4. relevant route registration passes
5. CI status is green OR explicitly marked as UNVERIFIED
6. any unverified claims are clearly labeled UNVERIFIED

If any condition is not verified, the agent must explicitly state that.


---------------------------------------------------------------------
REQUIRED TASK REPORT FORMAT

Every task must return results in the following structure:

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

Technical explanation of the issue.

3. Intentional Behavior or Bug

Clarify if behavior was expected.

4. Files Changed

List of modified files.

5. Exact Code Fix

Relevant code modifications.

6. Updated Backend Flow

Explain the updated system behavior.

7. Commit Hash

8. CI Status

9. Preview Deployment Status

10. Verification Steps


---------------------------------------------------------------------
FINAL RULE

If the issue cannot be reproduced:

DO NOT IMPLEMENT A FIX.
