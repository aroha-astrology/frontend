# Progress

## Completed
- 2026-09-30 - Hybrid cloud-planner / local-coder scaffolding (`.ai/`, `.agents/`, `tools/local_agent/`).
- 2026-09-30 - Environment set up and smoke-tested: venv `.venv` (Python 3.12, google-antigravity 0.1.20, mcp 1.30), derived Ollama model `qwen3-8b-agent` (8192 ctx), MCP tool `run_local_coder` verified end to end (reads `.ai`, edits inside workspace, fallback LOCAL_RESULT written).
- 2026-10-06 - Daily Stories (flag `home.dailyStories`): story ring on the Home avatar, 4 stories (panchang, hora, deity, gita), share sheet. First real delegation; see the table below.

## Daily Stories: what the local coder did (2026-10-06)
| Task | File | Local coder result | Planner follow-up |
|---|---|---|---|
| 1 seen state | `lib/stories/seen.ts` + test | Failed twice: UTC date bug, a test file that did not compile, then an empty reply | Rewritten by the planner |
| 2 best hora | `lib/stories/hora.ts` | Logic right; `nowTime` built with `toLocaleTimeString` (12-hour "09:46 AM", breaks the maths), single quotes | Clock bug fixed, tidied; planner wrote the test |
| 3 weekday deity | `lib/stories/deity.ts` | Correct | Comment moved, rows put on one line |
| 4 Gita verse of the day | `lib/stories/gita-daily.ts` | Code right, but written to `src/utils/date-utils.ts` (no such folder) when asked for two files at once | Moved, fallback added; planner wrote the test |
| 5 share links | `lib/stories/share.ts` | Correct as written | Planner wrote the test |
| 6-13 ring, viewer, slides, share sheet, header wiring | `components/stories/*` | Not delegated | Written by the planner |

## What works with qwen3-8b-agent (learned 2026-10-06)
- ONE file per run, exact path, exact signatures, the algorithm as numbered steps. Then it is reliable.
- Do not ask it to write tests or run commands: it produced uncompilable tests and wandered into unrelated failures.
- Say the style out loud (double quotes, 2 spaces) or it uses its own.
- Two files in one handoff is too many: it invented a path.
- The handoff must stay under 3000 characters (`LOCAL_CODER_MAX_FILE_CHARS`), which is too small to specify a designed UI component. UI work stays with the planner.
- `tools/local_agent/ollama_shim.py` now hides write_to_file's `ArtifactMetadata` argument; the model kept filling it in and the harness rejected the call.

## Active
- (none)

## Blockers
- None. Open item: confirm Antigravity IDE loads `.agents/mcp_config.json` (else paste the block into its global MCP settings).
- The `run_local_coder` MCP tool is not attached to Claude Code sessions. The planner calls the same function directly: `.venv/Scripts/python.exe -c "import asyncio,sys; sys.path.insert(0,'tools/local_agent'); import mcp_server; print(asyncio.run(mcp_server.run_local_coder('Implement the task in CLOUD_HANDOFF.md')))"` with `LOCAL_CODER_MODEL=qwen3-8b-agent` and `pnpm` on PATH.

## Next
- Keep delegating single pure-logic files; keep UI with the planner.
