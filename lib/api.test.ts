import { describe, it, expect, afterEach, vi } from "vitest";
import { request, ApiError } from "./api";

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
