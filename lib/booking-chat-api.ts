// Typed client for the booking chat SSE stream:
// GET /v1/bookings/{bookingType}/{bookingId}/messages/stream
//
// Parallel to lib/swarm-api.ts's streamChat(), reusing the same hand-rolled
// SSE frame-parsing skeleton (fetch + getReader + TextDecoder, frames split
// on "\n\n", "event:"/"data:" lines). Deliberately simpler than streamChat():
// this backend is a simple server-side poller, NOT a token-by-token LLM
// stream, so each SSE event is already one complete BookingMessage — there is
// no token-coalescing buffer here, just parse-and-yield.
//
// Sending a message and fetching the full transcript are plain REST calls
// already covered by api.sendBookingMessage() / api.listBookingMessages() in
// lib/api.ts — this file only covers the /stream endpoint.

import { authHeaders } from "./swarm-api";
import type { BookingType, BookingMessage } from "./api";

const BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.arohaastrology.in"
).replace(/\/$/, "");

// ─── Error type ──────────────────────────────────────────────────────────────

export class BookingChatApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "BookingChatApiError";
  }
}

// ─── Stream event types ──────────────────────────────────────────────────────

export interface BookingMessageEvent {
  type: "message";
  data: BookingMessage;
}

export interface BookingStreamErrorEvent {
  type: "error";
  data: { message: string };
}

export type BookingStreamEvent = BookingMessageEvent | BookingStreamErrorEvent;

// ─── Endpoint ────────────────────────────────────────────────────────────────

/**
 * GET /v1/bookings/{bookingType}/{bookingId}/messages/stream — SSE stream of
 * new messages on a booking thread. Yields one { type: "message", data }
 * event per complete BookingMessage the backend pushes, or a distinct
 * { type: "error", data } event if the backend reports a stream-level error.
 *
 * The exact `event:` name the backend uses isn't pinned down beyond "message"
 * being the sensible default (mirroring streamChat()'s own fallback of
 * defaulting an unlabeled frame to "message") — any event whose `data:` line
 * parses as JSON and isn't explicitly typed "error" is treated as a full
 * BookingMessage payload, so this generator doesn't break if the backend
 * labels its frames slightly differently than expected.
 */
export async function* streamBookingMessages(
  bookingType: BookingType,
  bookingId: string,
): AsyncGenerator<BookingStreamEvent> {
  const headers = await authHeaders();

  // Same AbortController + timeout pattern as streamChat() — a long-lived
  // polling connection, so allow a generous window before giving up.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000);

  try {
    const res = await fetch(
      `${BASE_URL}/v1/bookings/${bookingType}/${bookingId}/messages/stream`,
      {
        method: "GET",
        headers,
        signal: controller.signal,
      },
    );

    if (!res.ok) {
      const text = await res.text();
      let detail = text;
      try {
        const parsed = JSON.parse(text);
        detail = parsed?.detail ?? parsed?.error?.message ?? text;
      } catch {
        /* use raw text */
      }
      throw new BookingChatApiError(res.status, "stream_error", String(detail));
    }

    const reader = res.body?.getReader();
    if (!reader) throw new BookingChatApiError(0, "no_body", "Response has no body");

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE frames: "event: <type>\ndata: <json>\n\n"
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? ""; // keep incomplete frame in buffer

        for (const frame of frames) {
          if (!frame.trim()) continue;

          let eventType = "message";
          let dataStr = "";

          for (const line of frame.split("\n")) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              dataStr = line.slice(6);
            }
          }

          if (!dataStr) continue;

          try {
            const data = JSON.parse(dataStr);

            if (eventType === "error") {
              yield { type: "error", data: { message: data.message ?? "Unknown error" } };
            } else {
              // "message" (or any other/unlabeled event type) — treat as a
              // complete BookingMessage. There is no token/delta case to
              // special-case here, unlike streamChat().
              yield { type: "message", data: data as BookingMessage };
            }
          } catch {
            // Malformed JSON in SSE data — skip frame
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new BookingChatApiError(408, "timeout", "Booking chat stream timed out after 5 minutes");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
