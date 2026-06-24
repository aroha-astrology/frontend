// Typed client for the Aroha Swarm API (aroha-swarm service).
// Spec: http://13.232.179.137:3000/docs
//
// Auth: Firebase ID token as `Authorization: Bearer <token>`.
// All personal-data endpoints are DPDP consent-gated.

import { getFirebaseAuth } from "./firebase";

const SWARM_BASE = (
  process.env.NEXT_PUBLIC_SWARM_API_URL ?? "http://13.232.179.137:3000"
).replace(/\/$/, "");

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BirthInput {
  date: string;
  time: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface PresentationBlock {
  hook: string;
  highlights: { finding_id: string; text: string }[];
  analysis_md: string;
  chips: { kind: string; label: string; value?: number | null; sentiment: string }[];
  glossary: { term: string; plain: string }[];
  score: number | null;
}

export interface OnboardingResponse {
  requestId: string;
  intent: string;
  metrology: Record<string, unknown> | null;
  findings: Record<string, unknown>[];
  warnings: string[];
}

export interface ForecastResponse {
  requestId: string;
  intent: string;
  metrology: Record<string, unknown> | null;
  synthesis: Record<string, unknown> | null;
  atmosphere: Record<string, unknown> | null;
  findings: Record<string, unknown>[];
  warnings: string[];
}

export interface MatchmakingResponse {
  requestId: string;
  compatibility: {
    scores: { koota: string; maxScore: number; score: number; compatibility: string }[];
    totalScore: number;
    maxTotal: number;
    overallCompatibility: string;
  } | null;
}

export interface PanchangResponse {
  by_region: Record<string, unknown>;
  by_current_location?: Record<string, unknown> | null;
  warnings?: string[];
}

export interface LegalDoc {
  version: string;
  title: string;
}

// ─── Core helper ────────────────────────────────────────────────────────────

async function authHeader(): Promise<Record<string, string>> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Not signed in");
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

async function swarmRequest<T>(
  path: string,
  opts: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const { method = "GET", body, auth: needsAuth = true } = opts;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (needsAuth) Object.assign(headers, await authHeader());

  const res = await fetch(`${SWARM_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Swarm API ${res.status}: ${text.slice(0, 200)}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── SSE stream helper ──────────────────────────────────────────────────────

export async function* streamChat(
  message: string,
): AsyncGenerator<{ type: string; data: Record<string, unknown> }> {
  const headers = await authHeader();
  headers["Content-Type"] = "application/json";

  const res = await fetch(`${SWARM_BASE}/v1/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({ message }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`Chat stream failed: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    let eventType = "message";
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        eventType = line.slice(7).trim();
      } else if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6));
          yield { type: eventType, data };
        } catch {}
      }
    }
  }
}

// ─── Endpoints ──────────────────────────────────────────────────────────────

export const swarmApi = {
  health: () => swarmRequest<{ status: string }>("/health", { auth: false }),

  onboarding: (birth: BirthInput, consent = true) =>
    swarmRequest<OnboardingResponse>("/v1/onboarding", {
      method: "POST",
      body: { birth, consent },
    }),

  dailyForecast: (birth: BirthInput, consent = true) =>
    swarmRequest<ForecastResponse>("/v1/forecast/daily", {
      method: "POST",
      body: { birth, consent },
    }),

  matchmaking: (person1: BirthInput, person2: BirthInput, consent = true) =>
    swarmRequest<MatchmakingResponse>("/v1/matchmaking", {
      method: "POST",
      body: { person1, person2, consent },
    }),

  panchang: (region = "North_Indian", lat?: number, lon?: number) => {
    const params = new URLSearchParams({ region });
    if (lat != null) params.set("lat", String(lat));
    if (lon != null) params.set("lon", String(lon));
    return swarmRequest<PanchangResponse>(`/v1/panchang?${params}`);
  },

  // Legal
  legalCurrent: () =>
    swarmRequest<{ documents: Record<string, LegalDoc> }>("/v1/legal/current", { auth: false }),

  legalAccept: (docType: string, docVersion: string) =>
    swarmRequest<{ status: string }>("/v1/legal/accept", {
      method: "POST",
      body: { doc_type: docType, doc_version: docVersion },
    }),

  legalStatus: () => swarmRequest<{ accepted: Record<string, unknown>; missing: string[]; all_accepted: boolean }>("/v1/legal/status"),

  // Account / data-rights
  deleteAccount: () => swarmRequest<{ status: string }>("/v1/account", { method: "DELETE" }),
  dataExport: () => swarmRequest<{ status: string; data: Record<string, unknown> }>("/v1/data-export", { method: "POST" }),
  withdrawConsent: () => swarmRequest<{ status: string }>("/v1/consent/withdraw", { method: "POST" }),

  // Billing
  getPlan: () => swarmRequest<{ plan: string; balance: number }>("/v1/billing/plan"),
  getBalance: () => swarmRequest<{ balance: number }>("/v1/billing/balance"),
  purchaseTokens: (amount: number) =>
    swarmRequest<{ new_balance: number }>("/v1/billing/tokens", { method: "POST", body: { amount } }),
  getLedger: () => swarmRequest<{ transactions: Record<string, unknown>[] }>("/v1/billing/ledger"),

  // Warmup (product tour)
  warmupStatus: (jobId: string) =>
    swarmRequest<{ status: string; blocks_ready?: string[]; pending?: string[] }>(`/v1/warmup/${jobId}`),
};
