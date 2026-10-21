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

## Active
- None (Palmistry V2 code implementation is complete).

## Completed (Recent)
- 2026-10-21 - **Palmistry V2** (branch `feat/palmistry-v2` in frontend & backend):
  - Step 0A: Auto-capture with Laplacian variance & landmark movement tracking behind `palm.autoCapture`.
  - Step 0B: Reduced capture slots from 6 to 3 (`primaryFront`, `primaryPercussion`, `primaryFingertips`), backward-compat legacy slot support, updated 7 Indian language translations and 14 generated locale files.
  - Step 1: MediaPipe 21 landmarks (`detectHand`) ingested and forwarded from client to backend.
  - Step 2: Pixel-space hand geometry biometrics (`palm-biometrics.ts`), dome mount relief scorer (`mountRelief.ts`), feature-flagged biometric overrides, lighting guard.
  - Step 3: Anatomical prompt anchors for Stage A; Gemini fallback per-line confidence gating.
  - Step 4: Multi-scale Hessian ridge crease snapping and Viterbi alignment (`crease-snap.ts`); convex bounding polygon and sideline gate (`trace-gate.ts`).
  - Step 5: Anatomical line timing with landmark projection; $\pm 2$ year chart clamp; null anchors for marriage/children callouts.
  - Step 6: Polling timeout raised to 20 minutes with 5s cap (`usePalmReading.ts`); Lines/Mounts toggle in `PalmAnnotatedView.tsx` behind `palm.mountsToggle`. All tests passing (backend 10/10 suites, frontend 74/74 suites).

## Blockers
- None.

## Next
- 10-real-palm validation review (by user).
- Toggle feature switches in admin when ready.
