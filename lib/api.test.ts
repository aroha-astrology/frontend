import { describe, it, expect, afterEach, vi } from "vitest";

vi.mock("./firebase", () => ({
  getFirebaseAuth: () => ({ currentUser: { getIdToken: async () => "test-token" } }),
}));

import { request, ApiError, setSessionInvalidHandler } from "./api";

/**
 * Reproduces the "stuck spinner forever" bug: request() had no timeout at
 * all, so a connection that never resolves (bad network, stalled proxy, a
 * hung backend) left the caller's await pending indefinitely with no error
 * ever surfacing. Uses a short timeoutMs so the test itself stays fast.
 */
describe("request() timeout", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("rejects with an ApiError instead of hanging forever when fetch never resolves", async () => {
    global.fetch = vi.fn(() => new Promise<Response>(() => {})) as unknown as typeof fetch;

    await expect(
      request("/v1/me", { method: "PATCH", timeoutMs: 30 } as never),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it("still resolves normally for a fetch that returns promptly", async () => {
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    ) as unknown as typeof fetch;

    await expect(request("/v1/me", { timeoutMs: 30 } as never)).resolves.toEqual({ ok: true });
  });
});

/**
 * An authenticated call's 401 (revoked token, or the account was deleted server-side mid-
 * session) used to leave every screen to hit its own error with no path back to sign-in.
 * setSessionInvalidHandler is how AuthProvider (which request() can't import — it's a plain
 * function, not a hook) wires itself up to drive a real sign-out from this one place instead.
 */
describe("request() session-invalid handler", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    setSessionInvalidHandler(() => {});
    vi.restoreAllMocks();
  });

  it("fires the registered handler on a 401 from an authenticated call", async () => {
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: { code: "unauthorized", message: "no" } }), {
        status: 401,
      }),
    ) as unknown as typeof fetch;

    const handler = vi.fn();
    setSessionInvalidHandler(handler);

    await expect(request("/v1/me", { auth: true, timeoutMs: 30 })).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does not fire the handler for a 401 on an unauthenticated call", async () => {
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: { code: "unauthorized", message: "no" } }), {
        status: 401,
      }),
    ) as unknown as typeof fetch;

    const handler = vi.fn();
    setSessionInvalidHandler(handler);

    await expect(request("/v1/public/thing", { timeoutMs: 30 })).rejects.toBeInstanceOf(ApiError);
    expect(handler).not.toHaveBeenCalled();
  });
});
