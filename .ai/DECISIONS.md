# Decisions

> Never store secrets. Append newest at the bottom: date, decision, why.

## 2026-09-30 - Hybrid cloud-planner + local-coder workflow
- Decision: shared state lives in `.ai/*.md` files, not in chat memory; the cloud planner delegates implementation to a local Qwen agent through the MCP tool `run_local_coder`.
- Why: cheaper/faster bulk edits locally, and both agents stay consistent through files that are version-inspectable.
- Consequence: the planner MUST verify results from `git diff` and real test runs; `LOCAL_RESULT.md` is a claim, not proof.

## 2026-09-30 - Local model configuration
- Decision: default model `qwen3:8b` on Ollama at `http://localhost:11434/v1`, overridable with env vars `LOCAL_CODER_MODEL`, `LOCAL_CODER_BASE_URL`.
- Why: the user chooses the model; nothing is hard-wired. No API key is needed for Ollama.

## Existing product decisions
- New features ship OFF behind a flag until approved.
- Pass subscription is Google Play billing only; Razorpay was removed.

## 2026-09-30 - Local coder guard rails and Ollama workarounds
- Ollama context: derived model `qwen3-8b-agent` (`num_ctx 8192`, same weights as `qwen3:8b`) because `/v1` ignores per-request `num_ctx` and the 4096 default breaks the prompt.
- `tools/local_agent/ollama_shim.py` loopback proxy: adds `content: ""` to empty assistant turns (SDK issue #225) and sets `reasoning_effort: none` so Qwen3 thinking does not exhaust tokens.
- Tools limited to file tools + run_command; file tools workspace-confined; run_command regex denies installs, deletions, destructive git, `.env` (an 8B model tried `npm install` unprompted).
- `mcp` pinned `<2` (v2 renamed FastMCP).

## 2026-10-06 - Daily Stories (flag `home.dailyStories`)
- The four stories are the same for every profile and built in the frontend from routes that already exist (`/v1/panchang`, `/v1/gita/verses`, `public/shlokas/shlokas.json`). No new backend route; the backend only registers the flag.
- "Seen" is kept per device in localStorage (`aroha:stories:seen:v1`), keyed by the device's calendar day. Not synced to the server.
- Stories carry their own fixed dark palette (`components/stories/story-theme.ts`), not the theme tokens: they are shared as pictures and must look the same in the light theme.
- A story's content component is drawn twice: on screen (`mode="view"`) and inside the 360x640 share card (`mode="card"`), which is captured at 3x into a 1080x1920 PNG with modern-screenshot.
- Picture sharing from inside the Android app needs the native `StoryShare` plugin (app 1.15, build 18). Older builds and desktop browsers send the caption and link only.
- Home never opens a location prompt for the stories: they use the device's position only when it was already granted, otherwise the Delhi reference timings (and say so).

## 2026-10-07 - Daily Stories numbers for the admin dashboard
- PostHog events alone could not feed the admin dashboard (it reads our own database, and PostHog only records users who agreed to analytics), so the app also reports to the backend: `POST /v1/stories/events`.
- A view is reported once per story per day (the first opening), and the backend also refuses a second one. A share is reported at the tap on a place in the share sheet, whatever happens next; the dashboard says so.
- The card follows the Overview page's date range, unlike the Pass card, which is fixed at 30 days.
