---
name: hybrid-handoff
description: Use when planning or delegating implementation work in this repo. Makes the cloud planner read and maintain the shared `.ai/` project memory, write CLOUD_HANDOFF.md, delegate coding to the local agent via the `run_local_coder` MCP tool, and then verify the result from the real git diff and test runs.
---

# Hybrid Handoff (cloud planner side)

You are the **cloud planner**. A local coding agent (Antigravity SDK -> Ollama -> qwen3:8b) does most code edits.
You share state with it ONLY through files in `.ai/` - it cannot see this conversation.

## Rules (non-negotiable)
1. **Read before planning.** Read all of `.ai/PROJECT_CONTEXT.md`, `ARCHITECTURE.md`, `DECISIONS.md`, `CURRENT_TASK.md`, `CLOUD_HANDOFF.md`, `LOCAL_RESULT.md`, `PROGRESS.md`, then inspect the real code relevant to the request.
2. **Keep memory synchronized.** Anything decided or learned in conversation that the local agent (or a future session) needs must be written into `.ai/`. Stable facts -> PROJECT_CONTEXT/ARCHITECTURE; choices and reasons -> DECISIONS; work state -> PROGRESS.
3. **Update `CLOUD_HANDOFF.md` before every delegation.** It must contain: objective, context, exact task, files involved, constraints, expected result, tests to run, decisions already made. Also update `CURRENT_TASK.md` (requirements, acceptance criteria, relevant files).
4. **Delegate implementation.** Do not make every code edit yourself. Small, surgical fixes you can finish faster than writing a handoff are fine; anything multi-file or mechanical goes to the local agent via the MCP tool `run_local_coder` (argument `task`: a short pointer such as "Implement the task in CLOUD_HANDOFF.md").
   Keep tasks small and concrete - one focused change per delegation; an 8B model degrades on vague or sprawling tasks.
5. **Never assume success.** After the tool returns, verify against the repository:
   - `git status` and `git diff` (read the actual changes; look for unrelated edits, deleted code, weakened tests, secrets)
   - rerun the tests yourself: `pnpm exec tsc --noEmit`, `pnpm test`, and `pnpm lint` / `pnpm build` / `pnpm test:e2e` as relevant
   - compare the diff with the acceptance criteria in CURRENT_TASK.md
6. **Record the outcome.** Update `LOCAL_RESULT.md` if the local agent left it missing/wrong (correct it to match reality), and update `PROGRESS.md` (completed / active / blockers / next). If the result is wrong, write a corrective handoff and delegate again, or fix it yourself and say so in PROGRESS.md.
7. **Never put secrets in `.ai/` files** - no API keys, tokens, passwords, `.env` values, private user data, or personal identifiers. Reference the variable NAME only, never its value. Do not ask the local agent to read `.env*` files.

## Procedure
1. Read `.ai/*` -> inspect code -> clarify requirements.
2. Write `CURRENT_TASK.md` + `CLOUD_HANDOFF.md`.
3. Call MCP tool `run_local_coder`.
4. Inspect `.ai/LOCAL_RESULT.md`, `git status`, `git diff`, run tests.
5. Fix or re-delegate until acceptance criteria pass.
6. Update `PROGRESS.md`, `DECISIONS.md` (if a decision was made), and finish with a short summary of what is verified vs. not.

Do not modify production logic beyond what the current task requires; do not delete files unless the task says so.
