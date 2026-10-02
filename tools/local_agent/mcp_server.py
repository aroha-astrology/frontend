"""MCP stdio server exposing `run_local_coder`.

Cloud planner -> .ai/*.md handoff -> this tool -> Antigravity SDK local agent
-> Ollama (qwen3:8b) -> same project workspace -> .ai/LOCAL_RESULT.md

Configuration (all optional, no credentials involved):
  LOCAL_CODER_MODEL     default "qwen3:8b"
  LOCAL_CODER_BASE_URL  default "http://localhost:11434/v1"
  LOCAL_CODER_TIMEOUT   seconds, default 1800
  LOCAL_CODER_MAX_FILE_CHARS  per-context-file cap in the prompt, default 3000
  LOCAL_CODER_SHIM     "1" (default) routes Ollama traffic through ollama_shim.py; "0" disables
  LOCAL_CODER_THINK    "1" keeps Qwen3 thinking on (default off)

IMPORTANT: stdout is the MCP protocol channel. Never print() here; log to stderr.
"""

from __future__ import annotations

import asyncio
import logging
import os
import re
import sys
from pathlib import Path

from mcp.server.fastmcp import FastMCP

logging.basicConfig(stream=sys.stderr, level=logging.INFO)
log = logging.getLogger("local-coding-agent")

MODEL = os.environ.get("LOCAL_CODER_MODEL", "qwen3:8b")
BASE_URL = os.environ.get("LOCAL_CODER_BASE_URL", "http://localhost:11434/v1")
TIMEOUT_S = int(os.environ.get("LOCAL_CODER_TIMEOUT", "1800"))
MAX_FILE_CHARS = int(os.environ.get("LOCAL_CODER_MAX_FILE_CHARS", "3000"))
USE_SHIM = os.environ.get("LOCAL_CODER_SHIM", "1") != "0"
# Qwen3 thinking often yields empty turns the harness rejects; the shim disables it via reasoning_effort.
NO_THINK = os.environ.get("LOCAL_CODER_THINK", "0") != "1"

# tools/local_agent/mcp_server.py -> project root is two levels up.
PROJECT_ROOT = Path(__file__).resolve().parents[2]
AI_DIR = PROJECT_ROOT / ".ai"
CONTEXT_FILES = [
    "PROJECT_CONTEXT.md",
    "ARCHITECTURE.md",
    "DECISIONS.md",
    "CURRENT_TASK.md",
    "CLOUD_HANDOFF.md",
    "PROGRESS.md",
]
RESULT_FILE = AI_DIR / "LOCAL_RESULT.md"

SYSTEM_INSTRUCTIONS = f"""You are the LOCAL CODER in a hybrid cloud-planner / local-coder workflow.
Your workspace is the project at {PROJECT_ROOT}. Work ONLY inside it.

Rules:
- ALWAYS use absolute paths starting with {PROJECT_ROOT} (for example {RESULT_FILE}). Relative or guessed paths are wrong.
- write_to_file requires all its arguments, including Overwrite (true to replace an existing file).
- Inspect first: list and read the relevant files before editing anything.
- Make the smallest change that satisfies the task. Match surrounding style.
- Never modify unrelated functionality. Never delete files unless the task says so.
- Never read, print, or copy .env files, API keys, tokens, or other secrets. Never write secrets into .ai files.
- Do not run destructive git commands (reset --hard, clean, force push) and do not commit or push.
- Run checks (pnpm exec tsc --noEmit, pnpm test, pnpm lint) ONLY when the handoff asks for them or you changed code. NEVER run install commands (npm/pnpm/pip install); dependencies are already installed.
- Do exactly what the assignment says, then stop. Do not start extra work.
- Report real results only; never invent test output.
- When finished, OVERWRITE .ai/LOCAL_RESULT.md with sections: What changed, Files changed, Tests executed,
  Test results, Errors encountered, Unresolved issues, Recommended next action.
"""


# Commands the local coder may never run (installs, deletions, destructive/publishing git).
_BLOCKED_COMMAND = re.compile(
    r"\b(npm|pnpm|yarn|npx|pip)\s+(install|i|add|remove|uninstall|update|upgrade|publish|dlx)\b"
    r"|\bgit\s+(reset|clean|push|commit|checkout|restore|rebase|stash|merge|branch\s+-D)\b"
    r"|\b(rm|rmdir|del|erase|rd|Remove-Item|format|shutdown)\b"
    r"|\.env\b",
    re.IGNORECASE,
)


def _blocked(args: dict) -> bool:
    cmd = " ".join(str(v) for v in args.values() if isinstance(v, str))
    return bool(_BLOCKED_COMMAND.search(cmd))

mcp = FastMCP("local-coding-agent")


def _read_capped(path: Path) -> str:
    if not path.is_file():
        return "(missing)"
    text = path.read_text(encoding="utf-8", errors="replace")
    if len(text) > MAX_FILE_CHARS:
        text = text[:MAX_FILE_CHARS] + "\n...[truncated]"
    return text


def build_prompt(task: str) -> str:
    parts = [
        f"# Project root: {PROJECT_ROOT}\nUse absolute paths under this folder. The .ai folder is {AI_DIR}.\n",
        "# Your assignment\n\n"
        f"Planner instruction: {task}\n"
        "The full task is in .ai/CLOUD_HANDOFF.md (included below). Inspect the real source files first, implement, "
        "run the checks the handoff asks for, fix failures, then overwrite .ai/LOCAL_RESULT.md with the final report and stop.\n",
        "# Project memory (reference)\n",
    ]
    for name in CONTEXT_FILES:
        parts.append(f"## .ai/{name}\n\n{_read_capped(AI_DIR / name)}\n")
    parts.append(f"# Reminder\n\nYour assignment: {task}\nWrite the final report to {RESULT_FILE} when done.")
    return "\n".join(parts)


def _build_config(base_url: str):
    from google.antigravity import Agent, LocalOpenAIAgentConfig  # noqa: F401

    from google.antigravity import BuiltinTools, CapabilitiesConfig

    kwargs = dict(
        model=MODEL,
        # Coding tools only: no web search, no questions, no subagents (an 8B model wanders otherwise).
        capabilities=CapabilitiesConfig(
            enabled_tools=[
                BuiltinTools.LIST_DIR,
                BuiltinTools.SEARCH_DIR,
                BuiltinTools.FIND_FILE,
                BuiltinTools.VIEW_FILE,
                BuiltinTools.CREATE_FILE,
                BuiltinTools.EDIT_FILE,
                BuiltinTools.RUN_COMMAND,
            ]
        ),
        base_url=base_url,
        workspaces=[str(PROJECT_ROOT)],
        system_instructions=SYSTEM_INSTRUCTIONS,
    )
    try:
        # File editing + terminal execution inside the workspace.
        from google.antigravity.hooks import policy

        # File tools confined to the workspace; everything else allowed.
        kwargs["policies"] = [
            *policy.workspace_only([str(PROJECT_ROOT)]),
            policy.deny("run_command", when=_blocked, reason="Blocked: installs, deletions, destructive git and .env access are not allowed."),
            policy.allow_all(),
        ]
    except Exception as exc:  # SDK layout differs: fall back to SDK defaults
        log.warning("policy.allow_all() unavailable (%s); using SDK default policies", exc)
    return LocalOpenAIAgentConfig(**kwargs)


async def _run_agent(prompt: str) -> str:
    from google.antigravity import Agent

    base_url, shim = BASE_URL, None
    if USE_SHIM:  # workaround for SDK issue #225 (empty assistant turn -> Ollama HTTP 400)
        from ollama_shim import start_shim

        base_url, shim = start_shim(BASE_URL, no_think=NO_THINK)
    try:
        async with Agent(_build_config(base_url)) as agent:
            response = await agent.chat(prompt)
            return await response.text()
    finally:
        if shim:
            shim.shutdown()


@mcp.tool()
async def run_local_coder(task: str) -> str:
    """Run the local Qwen coding agent on the task in .ai/CLOUD_HANDOFF.md.

    Args:
        task: Short instruction for the local coder (e.g. "Implement the task in CLOUD_HANDOFF.md").
    """
    if not AI_DIR.is_dir():
        return f"ERROR: {AI_DIR} not found. Project root resolved to {PROJECT_ROOT}."

    before = RESULT_FILE.read_text(encoding="utf-8", errors="replace") if RESULT_FILE.is_file() else ""
    prompt = build_prompt(task)
    log.info("Starting local coder: model=%s base_url=%s root=%s", MODEL, BASE_URL, PROJECT_ROOT)

    try:
        final_text = await asyncio.wait_for(_run_agent(prompt), timeout=TIMEOUT_S)
    except asyncio.TimeoutError:
        return f"ERROR: local coder timed out after {TIMEOUT_S}s. Inspect git diff; work may be partial."
    except ImportError as exc:
        return f"ERROR: Antigravity SDK not installed in this venv ({exc}). Run: pip install -r tools/local_agent/requirements.txt"
    except Exception as exc:  # connection refused, model missing, SDK errors...
        log.exception("local coder failed")
        return (
            f"ERROR: local coder failed: {type(exc).__name__}: {exc}\n"
            f"Check that Ollama is running at {BASE_URL} and that model '{MODEL}' is pulled."
        )

    after = RESULT_FILE.read_text(encoding="utf-8", errors="replace") if RESULT_FILE.is_file() else ""
    wrote_result = after != before
    if not wrote_result:
        RESULT_FILE.write_text(
            "# Local Result\n\n"
            "_The local agent did not update this file; the text below is its final message (unverified)._\n\n"
            f"{final_text}\n",
            encoding="utf-8",
        )

    summary = final_text.strip()
    if len(summary) > 3000:
        summary = summary[:3000] + "\n...[truncated; see .ai/LOCAL_RESULT.md]"
    note = "LOCAL_RESULT.md written by agent." if wrote_result else "LOCAL_RESULT.md was NOT written by agent; fallback created."
    return (
        f"{note}\n\n{summary}\n\n"
        "UNVERIFIED: inspect `git status`/`git diff` and rerun tests before trusting this."
    )


if __name__ == "__main__":
    mcp.run(transport="stdio")
