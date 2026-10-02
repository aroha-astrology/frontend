# Local coding agent (MCP) - Windows setup

```
Cloud planner -> .ai/*.md -> MCP `run_local_coder` -> Antigravity SDK -> Ollama qwen3:8b -> this workspace
```

Project root: `C:\Users\wookiee\aroha-astrology\frontend`

Model/URL are your choice: override with environment variables (set them in the `"env"` block of `.agents/mcp_config.json`):

| Variable | Default | Meaning |
|---|---|---|
| `LOCAL_CODER_MODEL` | `qwen3:8b` (the config file sets `qwen3-8b-agent`, see Prerequisites) | Ollama model name |
| `LOCAL_CODER_BASE_URL` | `http://localhost:11434/v1` | Ollama OpenAI endpoint |
| `LOCAL_CODER_TIMEOUT` | `1800` | seconds before the run is aborted |
| `LOCAL_CODER_MAX_FILE_CHARS` | `3000` | per-`.ai`-file cap inside the prompt |
| `LOCAL_CODER_SHIM` | `1` | `0` disables `ollama_shim.py` |
| `LOCAL_CODER_THINK` | `0` | `1` keeps Qwen3 thinking on |

`ollama_shim.py` is a loopback proxy the server starts automatically. It fixes two problems seen in testing: empty
assistant turns (SDK issue #225, HTTP 400) and Qwen3 "thinking" consuming the whole token budget (empty replies).

## 1. Prerequisites
- **Python 3.10+** (the SDK requires it). On this machine `python` is only the Microsoft Store shortcut - install real Python from python.org (tick "Add to PATH") or `winget install Python.Python.3.12`, then open a new terminal.
- **Ollama** for Windows, with the model pulled: `ollama pull qwen3:8b`
- **Context window (important).** Ollama defaults to 4096 tokens on an 8 GB GPU, far too small for the handoff prompt; the model then returns empty or garbled turns. Ollama's `/v1` endpoint ignores a per-request `num_ctx`, so create a derived model once (same weights, no download; `qwen3:8b` is untouched):
  ```powershell
  ollama create qwen3-8b-agent -f tools\local_agent\Modelfile.qwen3-8b-agent
  ```
  8192 tokens fit fully on an 8 GB GPU (12288 spilled about 13% to CPU). Alternative: `setx OLLAMA_CONTEXT_LENGTH 8192`, restart Ollama, and set `LOCAL_CODER_MODEL` to `qwen3:8b`.
- On this machine Ollama lives in `E:\Ollama` and models in `E:\OllamaModels`; if `ollama` is not on PATH use `E:\Ollama\ollama.exe`.

## 2. Virtual environment + dependencies (PowerShell)
```powershell
cd C:\Users\wookiee\aroha-astrology\frontend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r tools\local_agent\requirements.txt
```
(If activation is blocked by execution policy, don't activate; the commands above call the venv Python directly.)

## 3. Check Ollama
```powershell
ollama list                              # qwen3:8b must appear
curl http://localhost:11434/v1/models    # should return JSON
```

## 4. Test the MCP server
Import check:
```powershell
.\.venv\Scripts\python.exe -c "import mcp, google.antigravity; from google.antigravity import LocalOpenAIAgentConfig; print('ok')"
```
Interactive inspector (needs Node, already installed for this project):
```powershell
npx @modelcontextprotocol/inspector .\.venv\Scripts\python.exe tools\local_agent\mcp_server.py
```
In the inspector: Tools -> `run_local_coder` -> `task` = `Read .ai/CLOUD_HANDOFF.md and report what it says; make no code changes`.
Running the script directly just waits silently on stdin (stdio MCP) - that is normal; press Ctrl+C.

## 5. Antigravity workspace MCP config
Already created at `.agents/mcp_config.json`:
```json
{
  "mcpServers": {
    "local-coding-agent": {
      "command": "C:/Users/wookiee/aroha-astrology/frontend/.venv/Scripts/python.exe",
      "args": ["C:/Users/wookiee/aroha-astrology/frontend/tools/local_agent/mcp_server.py"]
    }
  }
}
```
Forward slashes are valid on Windows and avoid JSON escaping mistakes. Open the folder `frontend` as the Antigravity workspace, then reload MCP servers (or restart Antigravity). `local-coding-agent` should list one tool: `run_local_coder`.
If your Antigravity build expects the config elsewhere (e.g. its global MCP settings), paste the same `mcpServers` block there.

## 6. Test the tool end to end
1. Put a tiny, safe task in `.ai/CLOUD_HANDOFF.md` (e.g. "add a unit test for an existing pure function in lib/").
2. Ask the cloud planner (skill `hybrid-handoff`) to delegate, or call `run_local_coder` from the inspector with `task` = `Implement the task in CLOUD_HANDOFF.md`.
3. Check `.ai/LOCAL_RESULT.md`, then verify yourself: `git status`, `git diff`, `pnpm test`.

## Troubleshooting
| Symptom | Fix |
|---|---|
| `python` opens Microsoft Store / "Python was not found" | Install Python 3.10+ (see Prerequisites); disable the App execution alias for python.exe in Settings > Apps > Advanced app settings. |
| `ModuleNotFoundError: google.antigravity` | You installed into the wrong Python. Use `.\.venv\Scripts\python.exe -m pip install -r tools\local_agent\requirements.txt`. |
| `ImportError: cannot import LocalOpenAIAgentConfig` | Upgrade: `pip install -U google-antigravity` (needs >= 0.1.20). |
| Tool returns `connection refused` / 11434 | Start Ollama (`ollama serve` or the tray app). |
| `model 'qwen3:8b' not found` | `ollama pull qwen3:8b`. |
| HTTP 400 `invalid message content type: <nil>` | Known SDK/Ollama issue with empty assistant turns (google-antigravity-sdk-python #225); upgrade the SDK and retry with a more concrete task. |
| `argument Overwrite not found` or "empty output" warnings in logs | qwen3:8b sometimes drops tool arguments; the harness retries. Keep tasks small. |
| Agent ignores instructions / garbage edits / loops | 8B models struggle with vague or big tasks. Split into one small task per handoff; raise `OLLAMA_CONTEXT_LENGTH`; try a stronger model via `LOCAL_CODER_MODEL`. |
| Very slow | CPU inference. Use a GPU, lower `LOCAL_CODER_TIMEOUT` expectations, or smaller tasks. |
| Antigravity doesn't show the server | Check both paths in `.agents/mcp_config.json` exist; reload MCP servers; run the inspector to see the real error. |
| Nothing is written to `.ai/LOCAL_RESULT.md` | The server writes a fallback from the agent's final message; still verify with `git diff`. |

## Safety notes
- Tools enabled: list/search/find/view/create/edit files and run_command only (no web search, no questions, no subagents).
- File tools are confined to the project folder (`policy.workspace_only`). Tested: a write inside the workspace works; nothing was written outside it.
- `run_command` blocks installs (`npm/pnpm/yarn/pip install|add|remove...`), deletions (`rm`, `del`, `Remove-Item`...), destructive or publishing git (`reset`, `clean`, `push`, `commit`, `checkout`...) and anything mentioning `.env`. This is a regex guard (`_BLOCKED_COMMAND` in `mcp_server.py`), not a sandbox: shell commands still run as your Windows user. Review `git diff` after every run and work on a branch.
- Observed with qwen3:8b: it follows a short, concrete task but drifts on vague ones (in testing it tried `npm install`, now blocked). Always verify.
- No credentials are used or stored. Never put secrets in `.ai/`.
