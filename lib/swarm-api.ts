// Typed client for the Aroha Swarm backend endpoints:
// POST /v1/onboarding, POST /v1/chat (SSE), POST /v1/matchmaking.
//
// Auth model: same as lib/api.ts — Firebase ID token as Bearer header.
// The swarm backend is co-located behind the same NEXT_PUBLIC_API_BASE_URL.

import { getFirebaseAuth } from "./firebase";

const BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.arohaastrology.in"
).replace(/\/$/, "");

// ─── Error type ──────────────────────────────────────────────────────────────

export class SwarmApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public requestId?: string,
  ) {
    super(message);
    this.name = "SwarmApiError";
  }
}

// ─── Auth helper ─────────────────────────────────────────────────────────────

async function authHeaders(): Promise<Record<string, string>> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new SwarmApiError(401, "no_session", "Not signed in");
  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

// ─── Types (mirrors backend schemas.py) ──────────────────────────────────────

export interface BirthInput {
  date: string;       // ISO YYYY-MM-DD
  time: string;       // HH:MM
  latitude: number;
  longitude: number;
  timezone: string;   // IANA tz
  /** Confidence in `time` above. "unknown" (e.g. time left blank and
   * defaulted) tells the backend the Lagna-based reading may be unreliable
   * instead of silently trusting a defaulted time as exact. */
  timeAccuracy?: "exact" | "approximate" | "unknown";
}

// Onboarding (mirrors the deployed OnboardingResponse schema)
export interface OnboardingCharts {
  planets?: PlanetPosition[];
  houses?: unknown[];
  chart?: {
    ascendant?: {
      ascendantSign?: string;
      sign?: string;
      ascendantDegree?: number;
      degree?: number;
      signIndex?: number;
    };
  } & Record<string, unknown>;
  dasha?: {
    currentMahadasha?: DashaPeriod;
    currentAntardasha?: DashaPeriod;
    mahadashaSequence?: DashaPeriod[];
  };
}

export interface OnboardingResponse {
  profileId: string;
  summary: string;
  charts?: OnboardingCharts;
  insights?: string[];
}

export interface PlanetPosition {
  planet: string;
  sign: string;
  signIndex: number;
  house: number;
  degree: number;
  nakshatraIndex: number;
  nakshatra: string;
  nakshatraPada: number;
  isRetrograde: boolean;
}

export interface DashaPeriod {
  planet?: string;
  /** Some engine versions emit `lord` instead of `planet`. */
  lord?: string;
  start?: string;
  end?: string;
}

// Matchmaking (mirrors the deployed MatchmakingResponse schema)
export interface KutaDetail {
  name: string;
  obtained: number;
  maximum: number;
  description?: string;
}

export interface MatchmakingResponse {
  totalScore: number;
  maxScore: number;
  kutaDetails: KutaDetail[];
  /** Overall verdict string, e.g. "Good", "Excellent". */
  compatibility: string;
  /** Deterministic, template-based summary built only from the computed scores/flags below. */
  recommendation?: string;
  /** Near-disqualifying red flags, checked independently of the 36-point total. */
  flags?: { nadiDosha: boolean; bhakootDosha: boolean };
  /** Kuja/Mangal Dosha (Mars in 1/2/4/7/8/12 from Lagna), checked separately from the 36-point system.
   * `matched` is EFFECTIVE status (present and not classically cancelled) — a dosha that's
   * present but cancelled counts as not-Manglik, same as never having it. */
  mangalDosha?: {
    person1: boolean;
    person2: boolean;
    type1: "partial" | "full" | "cancelled" | "none";
    type2: "partial" | "full" | "cancelled" | "none";
    description1: string;
    description2: string;
    matched: boolean;
  };
  /** Set when either person's birth time was unknown/approximate — the Lagna-based
   * reading (including any Mangal Dosha assessed from Lagna) may be unreliable. */
  lagnaCaveat?: string;
}

/** Reply depth: "direct" (short, default) or "details" (long-form, structured). */
export type ChatDetailLevel = "direct" | "details";

// Chat SSE events
export interface ChatTokenEvent {
  type: "token";
  data: { content: string };
}

export interface ChatSummaryEvent {
  type: "summary";
  data: { summary: string };
}

export interface ChatDoneEvent {
  type: "done";
  data: { status: string };
}

export interface ChatErrorEvent {
  type: "error";
  data: { message: string };
}

export interface ChatSessionIdEvent {
  type: "session_id";
  data: { sessionId: string };
}

export type ChatStreamEvent = ChatTokenEvent | ChatSummaryEvent | ChatDoneEvent | ChatErrorEvent | ChatSessionIdEvent;

// ─── Endpoints ───────────────────────────────────────────────────────────────

/**
 * POST /v1/onboarding — compute a natal chart from birth data.
 */
export async function onboarding(
  birth: BirthInput,
  opts?: { locale?: string; region?: string; consent?: boolean },
): Promise<OnboardingResponse> {
  const headers = await authHeaders();

  const res = await fetch(`${BASE_URL}/v1/onboarding`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      birth,
      locale: opts?.locale ?? "en",
      region: opts?.region ?? "North_Indian",
      consent: opts?.consent ?? true,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    let detail = text;
    try {
      const parsed = JSON.parse(text);
      detail = parsed?.detail ?? parsed?.error?.message ?? text;
    } catch { /* use raw text */ }
    throw new SwarmApiError(res.status, "onboarding_error", String(detail));
  }

  return res.json();
}

/**
 * POST /v1/matchmaking — 36-point Ashtakoota compatibility analysis.
 */
export async function matchmaking(
  person1: BirthInput,
  person2: BirthInput,
  opts?: { locale?: string; consent?: boolean },
): Promise<MatchmakingResponse> {
  const headers = await authHeaders();

  const res = await fetch(`${BASE_URL}/v1/matchmaking`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      person1,
      person2,
      locale: opts?.locale ?? "en",
      consent: opts?.consent ?? true,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    let detail = text;
    try {
      const parsed = JSON.parse(text);
      detail = parsed?.detail ?? parsed?.error?.message ?? text;
    } catch { /* use raw text */ }
    throw new SwarmApiError(res.status, "matchmaking_error", String(detail));
  }

  return res.json();
}

/**
 * POST /v1/chat/feedback — thumbs up/down on an assistant reply. `up` just
 * increments a counter; `down` also saves the question/answer for review and
 * pings the team's Telegram alert chat server-side.
 * Never throws — a failed vote must never surface as a chat error. Callers
 * should call this fire-and-forget.
 */
export async function sendChatFeedback(opts: {
  vote: "up" | "down";
  sessionId?: string;
  question?: string;
  answer?: string;
  locale?: string;
}): Promise<void> {
  try {
    const headers = await authHeaders();
    await fetch(`${BASE_URL}/v1/chat/feedback`, {
      method: "POST",
      headers,
      body: JSON.stringify(opts),
    });
  } catch {
    // best-effort — see doc comment above
  }
}

/**
 * POST /v1/chat — SSE streaming chat with the AI Jyotish Scholar.
 * Yields parsed SSE events: { type: "token"|"done"|"error", data }.
 * Groups tokens into ~2-line chunks for better chat-like UX.
 */
export async function* streamChat(
  message: string,
  opts?: {
    locale?: string;
    /**
     * Existing session ID to continue — the backend loads the session's own
     * stored full history/summary server-side, so the client no longer
     * carries or sends its own history/summary buffer (see chatRoute in
     * astro.routes.ts: the transcript is persisted by reading-and-appending
     * to the stored record, not by re-saving whatever the client last had in
     * memory).
     */
    sessionId?: string;
    /** "direct" (short, default) or "details" (long-form, structured). */
    detailLevel?: ChatDetailLevel;
    /** User's Kundli chart ID for grounding AI responses in birth chart data. */
    chartId?: string;
    /**
     * A birth_profiles row id (from /v1/profiles) to compare the caller's own
     * chart against, enabling real Ashtakoota synastry grounding via
     * buildSecondChartFacts. Only meaningful when the user is signed in and
     * the target profile has relationship partner/spouse/prospective_match.
     */
    compareProfileId?: string;
    /**
     * An already-purchased match_report id (see reportsApi.purchase, key='match_report') to
     * ground this turn in the full Guna Milan score, 8 life-area risk factors, and narrative
     * cards the user already paid for and read, via the backend's buildMatchReportFacts.
     * Independent of compareProfileId — a match_report is not a saved birth_profiles row.
     */
    matchReportId?: string;
  },
): AsyncGenerator<ChatStreamEvent> {
  const headers = await authHeaders();

  // Use AbortController for timeout (5 minutes for streaming responses)
  // Streaming keeps connection alive, so we allow long response times
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000);

  try {
    const res = await fetch(`${BASE_URL}/v1/chat`, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        message,
        locale: opts?.locale ?? "en",
        detailLevel: opts?.detailLevel ?? "direct",
        ...(opts?.sessionId ? { sessionId: opts.sessionId } : {}),
        ...(opts?.chartId ? { chartId: opts.chartId } : {}),
        ...(opts?.compareProfileId ? { compareProfileId: opts.compareProfileId } : {}),
        ...(opts?.matchReportId ? { matchReportId: opts.matchReportId } : {}),
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      let detail = text;
      try {
        const parsed = JSON.parse(text);
        detail = parsed?.detail ?? parsed?.error?.message ?? text;
      } catch { /* use raw text */ }
      throw new SwarmApiError(res.status, "chat_error", String(detail));
    }

    const reader = res.body?.getReader();
    if (!reader) throw new SwarmApiError(0, "no_body", "Response has no body");

    // Details-mode replies are long structured markdown (headers, tables) —
    // flushing every ~100 chars/2 newlines like a short direct reply chops
    // that structure mid-header/mid-table-row, so use a much looser
    // threshold and flush on paragraph boundaries (blank line) instead.
    const isDetails = opts?.detailLevel === "details";
    const FLUSH_CHAR_THRESHOLD = isDetails ? 400 : 100;

    const decoder = new TextDecoder();
    let buffer = "";
    let tokenBuffer = ""; // Buffer tokens into ~2-line (or paragraph, in Details mode) chunks

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

            if (eventType === "token") {
              const content = data.content ?? "";
              tokenBuffer += content;

              // Direct mode: flush on ~2 newlines or 100 chars. Details mode:
              // flush on a paragraph break (blank line) or 400 chars, so a
              // markdown header/table row is far less likely to split mid-line.
              const shouldFlush = isDetails
                ? tokenBuffer.includes("\n\n") || tokenBuffer.length > FLUSH_CHAR_THRESHOLD
                : (tokenBuffer.match(/\n/g) || []).length >= 2 || tokenBuffer.length > FLUSH_CHAR_THRESHOLD;
              if (shouldFlush) {
                yield { type: "token", data: { content: tokenBuffer } };
                tokenBuffer = "";
              }
            } else if (eventType === "summary") {
              // Flush any pending tokens before summary
              if (tokenBuffer) {
                yield { type: "token", data: { content: tokenBuffer } };
                tokenBuffer = "";
              }
              yield { type: "summary", data: { summary: data.summary ?? "" } };
            } else if (eventType === "done") {
              // Flush any pending tokens before done
              if (tokenBuffer) {
                yield { type: "token", data: { content: tokenBuffer } };
                tokenBuffer = "";
              }
              yield { type: "done", data: { status: data.status ?? "complete" } };
            } else if (eventType === "error") {
              yield { type: "error", data: { message: data.message ?? "Unknown error" } };
            }
          } catch {
            // Malformed JSON in SSE data — skip frame
          }
        }
      }

      // Flush any remaining tokens
      if (tokenBuffer) {
        yield { type: "token", data: { content: tokenBuffer } };
      }
    } finally {
      reader.releaseLock();
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new SwarmApiError(408, "timeout", "Chat request timed out after 5 minutes");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Convenience namespace for importing all endpoints. */
export const swarmApi = {
  onboarding,
  matchmaking,
  streamChat,
} as const;
