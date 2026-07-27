// Typed client for the backend's Palm Reading feature — 6-frame guided
// capture, analyzed in three LLM stages, wallet-purchased, profile-scoped,
// translate-on-read per language. Built on lib/api.ts's exported
// `request<T>()` exactly like every other typed client in this app (see
// lib/reports-api.ts, the closest sibling — same all-200 status-field
// contract, no 202/403 dance to unwrap).
//
// Frames are stored on the backend's local disk, not a cloud bucket — upload
// and download both go straight through the authenticated API (see
// requestBinaryUpload/requestBinaryDownload in lib/api.ts) rather than a
// signed-URL round trip.

import { request, requestBinaryUpload, requestBinaryDownload } from "./api";

export const PALM_CAPTURE_SLOTS = [
  "primaryFront",
  "primaryPercussion",
  "primaryDorsal",
  "primaryFingertips",
  "secondaryFront",
  "secondaryPercussion",
] as const;

export type PalmCaptureSlot = (typeof PALM_CAPTURE_SLOTS)[number];

export type PalmReadingStatus = "pending" | "generating" | "observed" | "ready" | "failed";

export interface PalmReportSection {
  heading: string;
  paragraphs: string[];
}

export interface PalmReadingResponse {
  id: string;
  status: PalmReadingStatus;
  primaryHand: string;
  frames: Record<string, unknown>;
  unlocked: boolean;
  confidenceScore: number | null;
  sections?: PalmReportSection[];
  /** { primary: PalmHandObservations, secondary?: PalmHandObservations } — see palm-types on
   * the backend. Loosely typed on the wire on purpose; only line/mount polylines and labels
   * used by the annotated overlay are read out of this by name, everything else passes
   * through untouched. */
  observations?: Record<string, unknown>;
  scores?: Record<string, number>;
  synthesis?: Record<string, unknown>;
  error?: string | null;
}

export interface CreatePalmReadingResponse {
  readingId: string;
  primaryHand: string;
}

export const palmApi = {
  /** Starts a new reading (pending — no frames yet) for the active profile. */
  create: () => request<CreatePalmReadingResponse>("/v1/palm/readings", { method: "POST", auth: true }),

  /** Uploads one captured frame's raw JPEG bytes directly to the backend (local-disk storage,
   * no signed URL). Throws ApiError — 409 reading not accepting uploads, 400 empty body. */
  uploadFrame: (readingId: string, slot: PalmCaptureSlot, blob: Blob) =>
    requestBinaryUpload(`/v1/palm/readings/${readingId}/frames/${slot}`, blob),

  /** Downloads a captured frame's raw bytes as a Blob — caller wraps it in
   * `URL.createObjectURL()` for an `<img src>` and revokes it when done. */
  fetchFrameBlob: (readingId: string, slot: string) =>
    requestBinaryDownload(`/v1/palm/readings/${readingId}/frames/${slot}`),

  /** FREE — kicks off Stage A (vision measurement) once all 6 frames are uploaded. No wallet
   * charge. Produces the teaser (hand element, confidence, annotated overlay); poll GET until
   * status is "observed", then call `unlock()` for the full interpretation.
   * Throws ApiError — 400 missing frames, 409 already generating, 403 consent required. */
  analyze: (readingId: string) =>
    request<{ status: string }>(`/v1/palm/readings/${readingId}/analyze`, {
      method: "POST",
      auth: true,
    }),

  /** PAID — charges the wallet and kicks off Stage B/C (the full interpretation) for an
   * "observed" reading. Throws ApiError — 409 insufficient balance / already unlocking / scan
   * not finished, 403 FEATURE_DISABLED. Caller should `refresh()` (useAuth) afterward for the
   * real new balance. */
  unlock: (readingId: string) =>
    request<{ status: string }>(`/v1/palm/readings/${readingId}/unlock`, {
      method: "POST",
      auth: true,
    }),

  /** Records one hand's client-computed CV mount-relief scores (see lib/palm/computeMountRelief.ts).
   * Best-effort accuracy data — callers should swallow errors rather than surface them, since
   * this call failing must never block the capture flow. */
  saveMountRelief: (readingId: string, hand: "primary" | "secondary", scores: Record<string, number>) =>
    request<{ ok: boolean }>(`/v1/palm/readings/${readingId}/mount-relief`, {
      method: "POST",
      body: { hand, scores },
      auth: true,
    }),

  /** Poll target while status is 'generating'. */
  get: (readingId: string, language?: string) =>
    request<PalmReadingResponse>(
      `/v1/palm/readings/${readingId}${language ? `?language=${encodeURIComponent(language)}` : ""}`,
      { auth: true },
    ),

  list: () => request<{ readings: PalmReadingResponse[] }>("/v1/palm/readings", { auth: true }),
};
