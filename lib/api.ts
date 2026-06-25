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
}

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
};
