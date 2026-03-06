# Kimi Runbook

Use this runbook when sending implementation tasks to Kimi / OpenClaw.

Before making changes, read:

- `docs/ai/README.md`
- `docs/ai/product-context.md`
- `docs/ai/tech-context.md`
- `docs/ai/coding-rules.md`
- `docs/ai/qa-checklist.md`
- `docs/ai/prompt-template.md`

## Standard instruction for implementation

Read and follow the repository AI context files listed above.

Implement the requested task using the repository rules.

Requirements:
- create a new branch
- make only scoped changes
- do not refactor unrelated code
- follow coding rules from `docs/ai/coding-rules.md`
- verify the change does not break existing behavior
- commit changes
- push the branch
- open a pull request
- use the repository PR template

Return the following:
1. branch name
2. pull request link
3. summary of changes
4. how to test
5. known risks
6. anything not completed

## If task is based on a GitHub Issue

Use this instruction:

Implement GitHub issue #<ISSUE_NUMBER>.

Read and follow:
- `docs/ai/README.md`
- `docs/ai/product-context.md`
- `docs/ai/tech-context.md`
- `docs/ai/coding-rules.md`
- `docs/ai/qa-checklist.md`
- `docs/ai/prompt-template.md`

Requirements:
- create a new branch
- make only scoped changes
- commit changes
- push branch
- open pull request
- fill PR using repository pull request template

Return:
- branch name
- PR link
- summary of changes
- how to test
- known risks

## If task is a bugfix

Use this instruction:

Read and follow the repository AI context files.

Fix the described bug with minimal scoped changes.

Requirements:
- do not refactor unrelated modules
- preserve existing behavior outside the bugfix scope
- add only necessary changes
- create branch
- commit
- push
- open pull request

Return:
- root cause
- changed files
- PR link
- how to verify the fix
- risks
