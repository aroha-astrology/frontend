# Progress

## Completed
- 2026-09-30 - Hybrid cloud-planner / local-coder scaffolding (`.ai/`, `.agents/`, `tools/local_agent/`).
- 2026-09-30 - Environment set up and smoke-tested: venv `.venv` (Python 3.12, google-antigravity 0.1.20, mcp 1.30), derived Ollama model `qwen3-8b-agent` (8192 ctx), MCP tool `run_local_coder` verified end to end (reads `.ai`, edits inside workspace, fallback LOCAL_RESULT written).
- 2026-10-07 - Daily Stories admin numbers: the app reports story views and share taps (`lib/stories/report.ts`), the Admin Overview shows them (`components/admin/StoryStatsCard.tsx`). Backend: `modules/stories`, table `story_events`.
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
| admin share formatter (2026-10-07) | `lib/stories/admin-format.ts` | Right except it left out the sort step | Sort added; planner wrote the test |

## What works with qwen3-8b-agent (learned 2026-10-06)
- ONE file per run, exact path, exact signatures, the algorithm as numbered steps. Then it is reliable.
- Do not ask it to write tests or run commands: it produced uncompilable tests and wandered into unrelated failures.
- Say the style out loud (double quotes, 2 spaces) or it uses its own.
- Two files in one handoff is too many: it invented a path.
- Even with numbered steps it can skip one (the sort, 2026-10-07): check each step against the file.
- If the run fails with "connection refused", Ollama is listening on 127.0.0.1 only: set `LOCAL_CODER_BASE_URL=http://127.0.0.1:11434/v1`.
- The handoff must stay under 3000 characters (`LOCAL_CODER_MAX_FILE_CHARS`), which is too small to specify a designed UI component. UI work stays with the planner.
- `tools/local_agent/ollama_shim.py` now hides write_to_file's `ArtifactMetadata` argument; the model kept filling it in and the harness rejected the call.

## Model comparison, 2026-10-18 (Aroha Coins sprint)
Machine: RTX 2070 8 GB, 15 GB RAM. Every result below was checked by tests the planner wrote, never by the model's own report.

| Task | Model, window | Result | Time |
|---|---|---|---|
| `lib/profile-offer.ts` (1 function, 4 steps) | qwen3-8b-agent, 8K | Correct, 5/5 tests | 73 s |
| `lib/house-offer.ts` (4 functions) | qwen3-8b-agent, 8K | FAILED twice: empty turns | 20 s each |
| same | ornith-agent, 8K | FAILED: output cut off at the window | 103 s |
| same | ornith-agent, 16K | Correct, 13/13 tests | 121 s |
| same | qwen3, 16K | Correct, 13/13 tests | 98 s |
| `components/ui/HouseBundleButton.tsx` (React component) | qwen3, 16K | 6/6 render tests, but LEFT OUT the required `"use client";` first line | 85 s |
| same | ornith-agent, 16K | 6/6 render tests, every instruction followed | 98 s |

Findings:
- The earlier "qwen3 only manages one tiny file" limit was mostly the 8192-token window, not the model. At 16K both models handle a multi-function file and a small component.
- Memory at 16K: `ornith-agent` 5.7 GB, 100% GPU. `qwen3` 7.8 GB, 20% spilled to CPU. So only Ornith can use the bigger window cleanly on this card.
- Ornith followed the written spec more exactly (Qwen dropped one explicit line). Default model is now `ornith-agent`; `qwen3-8b-agent` stays as the fallback.
- Still true: ONE file per handoff, exact path, exact signatures, steps, style said out loud, no tests, no commands.
- Written by the local models in the coins sprint (planner wrote all tests): `lib/profile-offer.ts` (qwen3, 8K), `lib/house-offer.ts` (qwen3, 16K), `components/ui/HouseBundleButton.tsx` (ornith, 16K).

## Active
- (none)

## Blockers
- None. Open item: confirm Antigravity IDE loads `.agents/mcp_config.json` (else paste the block into its global MCP settings).
- The `run_local_coder` MCP tool is not attached to Claude Code sessions. The planner calls the same function directly: `.venv/Scripts/python.exe -c "import asyncio,sys; sys.path.insert(0,'tools/local_agent'); import mcp_server; print(asyncio.run(mcp_server.run_local_coder('Implement the task in CLOUD_HANDOFF.md')))"` with `LOCAL_CODER_MODEL=qwen3-8b-agent` and `pnpm` on PATH.

## Next
- Keep delegating single pure-logic files; keep UI with the planner.
