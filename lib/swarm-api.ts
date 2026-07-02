// Typed client for the Aroha Swarm backend endpoints:
// POST /v1/onboarding, POST /v1/chat (SSE), POST /v1/matchmaking.
//
// Auth model: same as lib/api.ts — Firebase ID token as Bearer header.
// The swarm backend is co-located behind the same NEXT_PUBLIC_API_BASE_URL.

import { getFirebaseAuth } from "./firebase";

const BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://13.232.179.137:3000"
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
  recommendation?: string;
}

// Chat SSE events
export interface ChatTokenEvent {
  type: "token";
  data: { content: string };
}

export interface ChatDoneEvent {
  type: "done";
  data: { status: string };
}

export interface ChatErrorEvent {
  type: "error";
  data: { error: string };
}

export type ChatStreamEvent = ChatTokenEvent | ChatDoneEvent | ChatErrorEvent;

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
 * POST /v1/chat — SSE streaming chat with the AI Jyotish Scholar.
 * Yields parsed SSE events: { type: "token"|"done"|"error", data }.
 */
export async function* streamChat(
  message: string,
  opts?: { locale?: string },
): AsyncGenerator<ChatStreamEvent> {
  const headers = await authHeaders();

  const res = await fetch(`${BASE_URL}/v1/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      message,
      locale: opts?.locale ?? "en",
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

          if (eventType === "token") {
            yield { type: "token", data: { content: data.content ?? "" } };
          } else if (eventType === "done") {
            yield { type: "done", data: { status: data.status ?? "complete" } };
          } else if (eventType === "error") {
            yield { type: "error", data: { error: data.error ?? "Unknown error" } };
          }
        } catch {
          // Malformed JSON in SSE data — skip frame
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/** Convenience namespace for importing all endpoints. */
export const swarmApi = {
  onboarding,
  matchmaking,
  streamChat,
} as const;
