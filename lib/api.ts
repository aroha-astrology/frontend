// Typed client for the Aroha Astrology Backend (v0.1.0).
// Spec: http://13.232.179.137:3000/docs  ·  base URL from NEXT_PUBLIC_API_BASE_URL.
//
// Auth model: the backend verifies a Firebase ID token passed as
// `Authorization: Bearer <token>`. Authed calls pull a fresh token from the
// signed-in Firebase user. The backend never issues OTPs — that happens
// client-side via Firebase (see providers/auth-provider).

import { getFirebaseAuth } from "./firebase";

const BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://13.232.179.137:3000"
).replace(/\/$/, "");

// ─── Types (mirrors components.schemas in openapi.json) ──────────────────────

export type Gender = "male" | "female" | "other" | null;

export interface PlaceOfBirth {
  name: string;
  lat: number;
  lon: number;
  tz: string;
}

export interface User {
  id: string;
  firebaseUid: string;
  phoneE164: string | null;
  displayName: string | null;
  gender: Gender;
  dateOfBirth: string | null; // YYYY-MM-DD
  timeOfBirth: string | null; // HH:mm[:ss]
  placeOfBirth: PlaceOfBirth | null;
  profileCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionResponse {
  user: User;
  created: boolean;
}

/** PATCH /v1/me body — all fields optional, additionalProperties:false. */
export interface UpdateMeBody {
  displayName?: string;
  gender?: Gender;
  dateOfBirth?: string; // YYYY-MM-DD
  timeOfBirth?: string; // HH:mm[:ss]
  placeOfBirth?: PlaceOfBirth | null;
  locale?: string;
  birthTimeSource?: string;
  relationshipStatus?: string;
  onboardingStatus?: string;
}

// ─── Kundli ──────────────────────────────────────────────────────────────────

export interface KundliReady {
  status: "ready";
  id: string;
  timeKnown: boolean | null;
  ayanamsa: string | null;
  houseSystem: string | null;
  chart: Record<string, unknown> | null;
  dasha: Record<string, unknown> | null;
  yogas: Record<string, unknown> | null;
  doshas: Record<string, unknown> | null;
  generatedAt: string | null;
}

/** 202 body: kundli generation pending/in-progress (poll again). */
export interface KundliPending {
  status: "pending" | "generating" | "failed";
  message?: string;
}

/** 422 body: birth params absent — frontend must collect them. */
export interface KundliMissing {
  status: "missing_parameters";
  missing: string[]; // e.g. ["timeOfBirth", "placeOfBirth"]
  message: string;
}

/** Unified surface returned by `api.getKundli()` — caller branches on `status`. */
export type KundliResult = KundliReady | KundliPending | KundliMissing;

export type Kundli = KundliReady;
export type KundliResponse = KundliResult;

// ─── Error type ──────────────────────────────────────────────────────────────

/** Normalised backend error (`{ error: { code, message, requestId } }`). */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ─── Core request helper ──────────────────────────────────────────────────────

async function authHeader(): Promise<Record<string, string>> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new ApiError(401, "no_session", "Not signed in");
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

interface RequestOpts {
  method?: string;
  body?: unknown;
  auth?: boolean;
}

async function request<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const { method = "GET", body, auth: needsAuth = false } = opts;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (needsAuth) Object.assign(headers, await authHeader());

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    // Network / mixed-content / CORS failure — no HTTP response at all.
    throw new ApiError(0, "network_error", "Could not reach the server");
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string; requestId?: string } } | null)
      ?.error;
    throw new ApiError(
      res.status,
      err?.code ?? "http_error",
      err?.message ?? `Request failed (${res.status})`,
      err?.requestId,
    );
  }

  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ─── Remedies ───────────────────────────────────────────────────────────────

export interface RemedyItem {
  id: string;
  title: string;
  description: string;
  remedy: string;
  category: string;
  icon: string;
  planet?: string;
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

export const api = {
  /** Public liveness probe. */
  health: () => request<{ status: string; uptimeSeconds: number }>("/healthz"),

  /** Public readiness probe (DB check). */
  ready: () =>
    request<{ status: string; checks: { db: string } }>("/readyz"),

  /**
   * Exchange the current Firebase ID token for an app user. Idempotent — safe
   * to call on every launch. `created` is true when a new user row was made.
   */
  createSession: () =>
    request<SessionResponse>("/v1/auth/session", { method: "POST", auth: true }),

  /** Current user profile. */
  getMe: () => request<User>("/v1/me", { auth: true }),

  /** Update current user profile. */
  updateMe: (body: UpdateMeBody) =>
    request<User>("/v1/me", { method: "PATCH", body, auth: true }),

  /** Soft-delete the current account. */
  deleteMe: () => request<void>("/v1/me", { method: "DELETE", auth: true }),

  /** Remedies for the user based on chart. */
  remedies: () => request<{ remedies: RemedyItem[] }>("/v1/remedies", { auth: true }),

  /** Moon-sign daily forecast for a zodiac sign (0-11). */
  moonSignForecast: (signIndex: number) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    request<{ forecast: any }>(`/v1/forecast/moon-sign/${signIndex}`, { auth: true }),

  /**
   * Current user's natal kundli. Returns a discriminated union — caller must
   * branch on `result.status`:
   *   - "ready"              → 200, full Kundli payload
   *   - "pending"/"generating"/"failed" → 202, still computing (caller polls)
   *   - "missing_parameters" → 422, birth fields absent
   * Unexpected status codes still throw `ApiError`.
   */
  getKundli: () => kundliRequest("GET", "/v1/kundli"),

  /**
   * Current user's personalized daily horoscope (generated by the daily
   * cron job). Throws ApiError(404) when today's horoscope hasn't been
   * generated yet — callers should treat that as an empty state, not a hard
   * error.
   */
  horoscope: () =>
    request<{ forDate: string; summary: string; model: string | null; generatedAt: string }>(
      "/v1/horoscope",
      { auth: true },
    ),

  /** Panchang data. */
  panchang: (lat?: number, lon?: number, date?: string) => {
    const params = new URLSearchParams();
    if (lat != null) params.set("lat", String(lat));
    if (lon != null) params.set("lon", String(lon));
    if (date) params.set("date", date);
    const qs = params.toString();
    return request<Record<string, unknown>>(`/v1/panchang${qs ? `?${qs}` : ""}`, { auth: true });
  },

  /**
   * Force-regenerate the kundli (synchronous on the backend). Same union as
   * `getKundli()`. 202 here means another regenerate run is already active.
   */
  regenerateKundli: () => kundliRequest("POST", "/v1/kundli/regenerate"),

  /**
   * Poll `getKundli()` until it returns a non-pending state or `timeoutMs`
   * elapses. Retries on 202 every `intervalMs` (default 2 s, matches the
   * swagger guidance). 422 (missing parameters) is returned immediately — no
   * point polling, the user has to complete their profile first.
   */
  pollKundli: (opts: { intervalMs?: number; timeoutMs?: number; signal?: AbortSignal } = {}) =>
    pollKundli(opts),
};

// ─── Kundli helpers ──────────────────────────────────────────────────────────

async function kundliRequest(method: "GET" | "POST", path: string): Promise<KundliResult> {
  const headers: Record<string, string> = { ...(await authHeader()) };
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { method, headers });
  } catch {
    throw new ApiError(0, "network_error", "Could not reach the server");
  }
  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (res.status === 200 || res.status === 202 || res.status === 422) {
    return data as KundliResult;
  }
  const err = (data as { error?: { code?: string; message?: string; requestId?: string } } | null)
    ?.error;
  throw new ApiError(
    res.status,
    err?.code ?? "http_error",
    err?.message ?? `Request failed (${res.status})`,
    err?.requestId,
  );
}

async function pollKundli(
  opts: { intervalMs?: number; timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<KundliResult> {
  const interval = opts.intervalMs ?? 2000;
  const deadline = Date.now() + (opts.timeoutMs ?? 60_000);
  while (true) {
    if (opts.signal?.aborted) throw new ApiError(0, "aborted", "Request aborted");
    const r = await kundliRequest("GET", "/v1/kundli");
    if (r.status !== "pending" && r.status !== "generating") return r;
    if (Date.now() + interval > deadline) return r; // give up but surface latest pending state
    await new Promise((res) => setTimeout(res, interval));
  }
}
