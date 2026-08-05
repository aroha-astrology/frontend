/**
 * Regression cover for the SSE frame parser in `streamChat`.
 *
 * The bug this exists for: the parser handled `token`/`summary`/`done`/`error`
 * but had no branch for `session_id`, so that frame was silently dropped. The
 * producer emitted it, `ChatSessionIdEvent` was declared, and
 * ChatConversation.tsx had a consumer waiting for it — but because the dispatch
 * was missing, `sessionIdRef` never got set, `?sessionId=` never reached the
 * URL, and every question the user asked opened a NEW chat session. Production
 * showed 304 sessions against 404 messages: conversations of ~1 turn each.
 *
 * A dropped frame type is invisible — no error, no warning, just a feature that
 * quietly does not work — so each event type is asserted explicitly here.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("./firebase", () => ({
  getFirebaseAuth: () => ({ currentUser: { getIdToken: async () => "test-token" } }),
}));

import { streamChat, SwarmApiError, type ChatStreamEvent } from "./swarm-api";

/** Builds a Response whose body streams the given raw SSE text in one chunk. */
function sseResponse(raw: string): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(raw));
      controller.close();
    },
  });
  return new Response(stream, { status: 200 });
}

const frame = (event: string, data: unknown) =>
  `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

async function collect(raw: string): Promise<ChatStreamEvent[]> {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => sseResponse(raw)),
  );
  const events: ChatStreamEvent[] = [];
  for await (const e of streamChat("hello")) events.push(e);
  return events;
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("streamChat SSE parsing", () => {
  it("surfaces the session_id frame so the client can keep one session per visit", async () => {
    const events = await collect(
      frame("token", { content: "Namaste" }) +
        frame("session_id", { sessionId: "sess-abc" }) +
        frame("done", { status: "complete" }),
    );

    const session = events.find((e) => e.type === "session_id");
    expect(session, "session_id frame must not be silently dropped").toBeDefined();
    expect(session).toEqual({ type: "session_id", data: { sessionId: "sess-abc" } });
  });

  it("emits session_id before done, so the id is captured before the loop breaks", async () => {
    // ChatConversation breaks out of the for-await on `done`. If session_id
    // arrived after it, the id would be discarded even with the branch present.
    const events = await collect(
      frame("session_id", { sessionId: "sess-1" }) + frame("done", { status: "complete" }),
    );
    const types = events.map((e) => e.type);
    expect(types.indexOf("session_id")).toBeLessThan(types.indexOf("done"));
  });

  it("still parses token, summary, done and error frames", async () => {
    const events = await collect(
      frame("token", { content: "a".repeat(150) }) +
        frame("summary", { summary: "we discussed marriage" }) +
        frame("error", { message: "boom" }),
    );

    expect(events.some((e) => e.type === "token")).toBe(true);
    expect(events.find((e) => e.type === "summary")).toEqual({
      type: "summary",
      data: { summary: "we discussed marriage" },
    });
    expect(events.find((e) => e.type === "error")).toEqual({
      type: "error",
      data: { message: "boom" },
    });
  });

  it("ignores an unknown frame type without throwing", async () => {
    const events = await collect(
      frame("something_new", { x: 1 }) + frame("done", { status: "complete" }),
    );
    expect(events.map((e) => e.type)).toEqual(["done"]);
  });

  it("surfaces a caller-triggered abort (Stop button) as user_stopped, not a timeout", async () => {
    // The internal 5-minute safety timeout and a user clicking Stop both abort
    // the SAME underlying fetch — this asserts they're still distinguishable
    // on the way out, since ChatConversation must never show "timed out" for
    // a stop the user asked for themselves.
    const external = new AbortController();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            // Real fetch rejects immediately if the signal is ALREADY aborted
            // by the time it's called — an AbortSignal only fires 'abort' once,
            // so a listener attached after the fact would never see it.
            if (init.signal?.aborted) {
              reject(new DOMException("Aborted", "AbortError"));
              return;
            }
            init.signal?.addEventListener("abort", () => {
              reject(new DOMException("Aborted", "AbortError"));
            });
          }),
      ),
    );

    const gen = streamChat("hello", { signal: external.signal });
    const drain = (async () => {
      const events: ChatStreamEvent[] = [];
      for await (const e of gen) events.push(e);
      return events;
    })();

    external.abort();

    await expect(drain).rejects.toMatchObject(
      expect.objectContaining({ code: "user_stopped" } as Partial<SwarmApiError>),
    );
  });

  it("handles a frame split across chunk boundaries", async () => {
    const raw = frame("session_id", { sessionId: "sess-split" }) + frame("done", { status: "ok" });
    const half = Math.floor(raw.length / 2);
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            new ReadableStream<Uint8Array>({
              start(controller) {
                const enc = new TextEncoder();
                controller.enqueue(enc.encode(raw.slice(0, half)));
                controller.enqueue(enc.encode(raw.slice(half)));
                controller.close();
              },
            }),
            { status: 200 },
          ),
      ),
    );

    const events: ChatStreamEvent[] = [];
    for await (const e of streamChat("hello")) events.push(e);

    expect(events.find((e) => e.type === "session_id")).toEqual({
      type: "session_id",
      data: { sessionId: "sess-split" },
    });
  });
});
