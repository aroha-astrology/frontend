---
name: local-delegation
description: Defines the cloud-planner / local-coder workflow and the local coder's duties. Use when running as the local coding agent (read .ai context, implement CLOUD_HANDOFF.md, run tests, write LOCAL_RESULT.md) or when the planner needs the delegation lifecycle.
---

# Local Delegation Workflow

```
CLOUD PLANNER -> .ai/ files -> MCP run_local_coder -> LOCAL CODER (Ollama qwen3:8b) -> same workspace -> .ai/LOCAL_RESULT.md -> CLOUD PLANNER verifies
```

## CLOUD PLANNER
1. Understand requirements.
2. Inspect the architecture and relevant code.
3. Create/update `.ai/CURRENT_TASK.md`.
4. Update `.ai/CLOUD_HANDOFF.md` (objective, context, exact task, files, constraints, expected result, tests, decisions).
5. Delegate via `run_local_coder`.
6. Review `.ai/LOCAL_RESULT.md`.
7. Inspect `git status` / `git diff`.
8. Run final validation (typecheck, unit tests, lint/build/e2e as relevant).
9. Update project memory (`PROGRESS.md`, `DECISIONS.md`, `LOCAL_RESULT.md` if inaccurate).
See the `hybrid-handoff` skill for the planner's hard rules.

## LOCAL CODER
1. Read all `.ai` files: PROJECT_CONTEXT, ARCHITECTURE, DECISIONS, CURRENT_TASK, PROGRESS.
2. Read `.ai/CLOUD_HANDOFF.md` - it is your task.
3. Inspect the real source code (list/read/search files) BEFORE editing anything.
4. Implement the requested change - minimal, matching surrounding style. Never modify unrelated functionality, never delete files unless told to.
5. Run relevant checks from the repo root: `pnpm exec tsc --noEmit`, `pnpm test`, `pnpm lint`, `pnpm build` as applicable to your change (avoid `pnpm test:e2e` unless the handoff asks for it).
6. If checks fail, read the error, fix, rerun. Stop after a few genuine attempts and report honestly.
7. Write `.ai/LOCAL_RESULT.md` (overwrite): what changed, files changed, tests executed, test results (real output summary), errors, unresolved issues, recommended next action.
8. Safety: work only inside this repository; never read, print or copy `.env*`, keys or tokens; never write secrets into `.ai/`; never run destructive git commands (`reset --hard`, `clean`, force push) or commit/push unless the handoff says so; never invent test results.
