import type { Page, Request, Route } from "@playwright/test";
import { makeHoroscope, makeRewardState, makeUser, primaryProfile, type E2EUser } from "./data";

/** Matches playwright.config.ts — a dead port, so an unmocked call can never reach a real server. */
export const API_ORIGIN = "http://127.0.0.1:3999";

export interface ApiCall {
  method: string;
  path: string;
  query: URLSearchParams;
  body: unknown;
}

/** `json` for normal endpoints; `body` + `contentType` for raw ones (the chat SSE stream). */
type Reply = { status?: number; json?: unknown; body?: string; contentType?: string };
type Handler = (call: ApiCall, state: MockState) => Reply | undefined;

export interface MockState {
  user: E2EUser;
  calls: ApiCall[];
  /** Requests no handler answered — a spec can assert this stays empty. */
  unmocked: string[];
}

/** "METHOD /v1/path" → handler. A `:param` segment matches anything. */
export type Handlers = Record<string, Handler>;

const DEFAULT_HANDLERS: Handlers = {
  "POST /v1/auth/session": (_c, s) => ({ json: { user: s.user, created: false } }),
  "GET /v1/me": (_c, s) => ({ json: s.user }),
  "PATCH /v1/me": (c, s) => {
    s.user = { ...s.user, ...(c.body as object) };
    return { json: s.user };
  },
  "POST /v1/me/activity-heartbeat": () => ({ json: { success: true } }),
  "GET /v1/me/notifications": () => ({ json: [] }),
  "PATCH /v1/me/notifications/read": () => ({ json: { success: true } }),
  "GET /v1/profiles": () => ({ json: [primaryProfile] }),
  "GET /v1/horoscope": (c) => ({ json: makeHoroscope(c.query.get("period") ?? "daily") }),
  // Still computing — cards show their pending state and poll; nothing under test needs a chart.
  "GET /v1/kundli": () => ({ status: 202, json: { status: "pending" } }),
  "GET /v1/forecast/moon-sign/:sign": () => ({ status: 404, json: { error: { code: "not_found", message: "e2e" } } }),
  "GET /v1/rewards/daily": () => ({ json: makeRewardState() }),
  "POST /v1/rewards/daily/claim": (_c, s) => ({ json: { claimed: true, walletBalancePaise: s.user.walletBalancePaise } }),
  "GET /v1/reports": () => ({ json: { reports: [] } }),
  "GET /v1/reports/stats": () => ({ json: {} }),
};

function matchKey(method: string, path: string, handlers: Handlers): Handler | undefined {
  const exact = handlers[`${method} ${path}`];
  if (exact) return exact;
  const parts = path.split("/");
  for (const [key, handler] of Object.entries(handlers)) {
    const [m, pattern] = key.split(" ");
    if (m !== method || !pattern) continue;
    const pp = pattern.split("/");
    if (pp.length === parts.length && pp.every((seg, i) => seg.startsWith(":") || seg === parts[i])) return handler;
  }
  return undefined;
}

function parseBody(request: Request): unknown {
  const raw = request.postData();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/**
 * Answers every backend call from canned data. `overrides` replace or add
 * handlers for one spec (same "METHOD /v1/path" keys). Returns the live state
 * so a spec can assert on the calls the page made.
 */
export async function mockApi(page: Page, opts: { user?: Partial<E2EUser>; overrides?: Handlers } = {}): Promise<MockState> {
  const state: MockState = { user: makeUser(opts.user), calls: [], unmocked: [] };
  const handlers: Handlers = { ...DEFAULT_HANDLERS, ...opts.overrides };

  await page.route(`${API_ORIGIN}/**`, async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    if (method === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders() });
      return;
    }
    const call: ApiCall = { method, path: url.pathname, query: url.searchParams, body: parseBody(request) };
    state.calls.push(call);
    const handler = matchKey(method, url.pathname, handlers);
    const reply = handler?.(call, state);
    if (!reply) {
      state.unmocked.push(`${method} ${url.pathname}`);
      await route.fulfill({ status: 404, headers: corsHeaders(), json: { error: { code: "not_mocked", message: `${method} ${url.pathname}` } } });
      return;
    }
    if (reply.body !== undefined) {
      await route.fulfill({
        status: reply.status ?? 200,
        headers: { ...corsHeaders(), "content-type": reply.contentType ?? "text/plain" },
        body: reply.body,
      });
      return;
    }
    await route.fulfill({ status: reply.status ?? 200, headers: corsHeaders(), json: reply.json ?? null });
  });

  return state;
}

function corsHeaders(): Record<string, string> {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "*",
    "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
  };
}

/** The calls matching "METHOD /v1/path" (exact path). */
export function callsTo(state: MockState, key: string): ApiCall[] {
  const [method, path] = key.split(" ");
  return state.calls.filter((c) => c.method === method && c.path === path);
}

/** A server-sent-events body in the backend chat stream's framing ("event: x
data: {json}

"). */
export function sseBody(events: [string, unknown][]): string {
  return events.map(([event, data]) => `event: ${event}
data: ${JSON.stringify(data)}

`).join("");
}
