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
