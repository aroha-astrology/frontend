"""Tiny loopback proxy between the Antigravity harness and Ollama.

Works around google-antigravity-sdk-python issue #225: the harness replays empty
assistant turns as {"role": "assistant"} with no "content", and Ollama answers
HTTP 400 "invalid message content type: <nil>". The shim adds "content": "" to
any message that lacks it (and sets reasoning_effort="none" so Qwen3 does not burn its
token budget on hidden thinking), and streams everything else through unchanged.
Stdlib only; logs to stderr (stdout is the MCP channel).
"""

from __future__ import annotations

import http.client
import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit


def _fix(body: bytes, no_think: bool) -> bytes:
    try:
        data = json.loads(body)
    except ValueError:
        return body
    msgs = data.get("messages") if isinstance(data, dict) else None
    if not isinstance(msgs, list):
        return body
    changed = False
    if no_think and "reasoning_effort" not in data:
        data["reasoning_effort"] = "none"  # Ollama: disable Qwen3 thinking (empty-content turns otherwise)
        changed = True
    for m in msgs:
        if isinstance(m, dict) and m.get("role") == "assistant" and m.get("content") is None:
            m["content"] = ""
            changed = True
    # Hide write_to_file's optional ArtifactMetadata argument: qwen3:8b fills it in for ordinary
    # source files, and the harness then rejects the whole call ("not a valid artifact path").
    for tool in data.get("tools") or []:
        params = (tool.get("function") or {}).get("parameters") if isinstance(tool, dict) else None
        if not isinstance(params, dict):
            continue
        props = params.get("properties")
        if isinstance(props, dict) and props.pop("ArtifactMetadata", None) is not None:
            changed = True
        required = params.get("required")
        if isinstance(required, list) and "ArtifactMetadata" in required:
            required.remove("ArtifactMetadata")
            changed = True
    return json.dumps(data).encode() if changed else body


def start_shim(upstream_base_url: str, no_think: bool = True) -> tuple[str, ThreadingHTTPServer]:
    """Start the proxy on a free loopback port; return (its base_url, server)."""
    up = urlsplit(upstream_base_url)
    up_host, up_port = up.hostname or "localhost", up.port or 80
    up_prefix = up.path.rstrip("/")

    class Handler(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.0"  # close-delimited body: simplest correct streaming

        def log_message(self, *a):  # keep stdio clean
            pass

        def _proxy(self):
            length = int(self.headers.get("Content-Length") or 0)
            body = self.rfile.read(length) if length else b""
            if self.command == "POST":
                body = _fix(body, no_think)
            path = self.path
            if not path.startswith(up_prefix):
                path = up_prefix + path
            conn = http.client.HTTPConnection(up_host, up_port, timeout=3600)
            headers = {k: v for k, v in self.headers.items()
                       if k.lower() not in ("host", "content-length", "connection", "accept-encoding")}
            headers["Content-Length"] = str(len(body))
            try:
                conn.request(self.command, path, body=body, headers=headers)
                resp = conn.getresponse()
                self.send_response(resp.status)
                for k, v in resp.getheaders():
                    if k.lower() not in ("transfer-encoding", "content-length", "connection"):
                        self.send_header(k, v)
                self.end_headers()
                while True:
                    chunk = resp.read1(8192) if hasattr(resp, "read1") else resp.read(8192)
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    self.wfile.flush()
            except Exception as exc:
                try:
                    self.send_error(502, f"shim upstream error: {exc}")
                except Exception:
                    pass
            finally:
                conn.close()

        do_GET = do_POST = do_PUT = do_DELETE = _proxy

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    server.daemon_threads = True
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return f"http://127.0.0.1:{server.server_address[1]}{up_prefix}", server
