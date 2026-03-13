
# KIMI AI AGENT RUNBOOK

This runbook defines how AI coding agents must operate inside the myLogistics repository.

Agents must follow these instructions before performing any investigation or implementation work.


================================================
REQUIRED READING ORDER
================================================

Before doing anything, the agent MUST read the following files in this order:

1. docs/ai/product-context.md
2. docs/ai/tech-context.md
3. docs/ai/current-product-state.md
4. docs/ai/system-map.md
5. docs/ai/coding-rules.md
6. docs/ai/qa-checklist.md
7. docs/ai/prompt-template.md

These files together define:

- business context
- system architecture
- current product state
- system navigation map
- coding constraints
- QA validation process
- prompt format


================================================
INVESTIGATION FIRST
================================================

Unless explicitly told otherwise, every task must start with investigation.

The agent must:

1. locate relevant frontend components
2. locate relevant backend routes
3. locate related database tables
4. trace request flow from UI → API → DB
5. confirm assumptions using real code

The agent must report findings before implementing changes.


================================================
COMPLETION GATE
================================================

You may NOT say:

- completed
- ready
- working
- fixed
- pushed successfully

unless ALL of the following are true:

1. code parses
2. build passes
3. relevant backend startup check passes
4. relevant route registration passes
5. CI status is green OR explicitly marked as not yet verified
6. any unverified claim is clearly marked as UNVERIFIED


================================================
SEPARATION OF MODES
================================================

If the task is INVESTIGATION ONLY:

- do not implement
- do not modify files
- do not propose code as completed work

If the task is IMPLEMENTATION:

First:
- summarize confirmed architecture constraints

Then:
- implement


================================================
SOURCE OF TRUTH
================================================

If documentation and code disagree:

THE CODE IS THE SOURCE OF TRUTH.

Documentation is a navigation aid only.
