// Typed client for the backend's Reports feature (named AI-generated
// reports — a mix of one-time and monthly, wallet-purchased, profile-scoped,
// translate-on-read per language — the exact catalogue is server-driven, see
// GET /v1/reports). Built on lib/api.ts's exported `request<T>()` exactly
// like every other typed client in this app.
//
// Unlike kundli/horoscope/gemstone, every status this backend returns
// (`generating` / `failed` / `ready`) comes back as a plain 200 — there's no
// 202/403 status-code dance to unwrap here, so a direct `request<T>()` call
// is enough for all of these endpoints.
//
// `stats()` backs the real "N reports generated" count shown alongside a
// report's price.

import { request } from "./api";

export type ReportPurchaseStatus = "generating" | "ready" | "failed";

/** One prior purchase of a report, as listed in the catalogue. */
export interface ReportPurchaseSummary {
  id: string;
  /** 'YYYY-MM' for a monthly report's purchase, null for a one-time report. */
  periodMonth: string | null;
  status: ReportPurchaseStatus;
}

/** One row of GET /v1/reports — a report type plus this profile's purchase history for it. */
export interface ReportCatalogueEntry {
  key: string;
  label: string;
  isMonthly: boolean;
  requiresPartner: boolean;
  enabled: boolean;
  /** Server-resolved price in paise — NEVER hardcode a report's price client-side. */
  pricePaise: number;
  /** "Strikethrough" MRP for the marketing discount treatment (₹149 ~~₹499~~
   * 70% off) — null means no discount is configured, render `pricePaise`
   * plainly. Only meaningful when it's strictly greater than `pricePaise`. */
  originalPricePaise: number | null;
  purchases: ReportPurchaseSummary[];
}

export interface ReportCatalogueResponse {
  reports: ReportCatalogueEntry[];
}

/** Raw partner birth data for a Kundli Milan purchase — the partner is NOT a saved profile. */
export interface ReportPartnerInput {
  dateOfBirth: string; // YYYY-MM-DD
  timeOfBirth: string; // HH:mm
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface PurchaseReportBody {
  reportKey: string;
  /** 'YYYY-MM' entries — monthly reports only, 1+ entries for a bundle purchase. */
  months?: string[];
  /** Omit (or null) for the primary profile. */
  birthProfileId?: string | null;
  /** kundli_milan only. */
  partner?: ReportPartnerInput;
  /** Optional answers to a small, skippable pre-purchase questionnaire — see
   * lib/report-questions.ts for which report keys have one configured. */
  answers?: Record<string, string>;
}

export interface PurchaseReportResultRow {
  id: string;
  reportKey: string;
  periodMonth: string | null;
  status: ReportPurchaseStatus;
}

/** One row per month for a monthly bundle purchase, or a single row otherwise. */
export interface PurchaseReportResponse {
  reports: PurchaseReportResultRow[];
}

/** A single ranked/scored/highlightable entry inside a section — currently only name_change
 * populates this, for its "Suggested Names" and "Suggested Spelling Adjustments" sections. */
export interface ReportSectionItem {
  /** The name, or the variant spelling. */
  title: string;
  /** Short fact chip, e.g. "Chaldean 5". */
  badge?: string;
  /** 0-100 match score. */
  score?: number;
  /** Top-2-by-score flag — renders as the "Best Match" pill. */
  highlight?: boolean;
  /** Spelling variants only: the exact edit applied, e.g. `added "a" at the end`. */
  note?: string;
  /** The practical benefits, in pointer form. */
  bullets: string[];
}

export interface ReportSection {
  /** Canonical section id, assigned server-side by position (see jyotish-backend's
   * config/report-sections.ts) — absent for a report type not yet listed there, or a
   * section-count mismatch. The page falls back to `heading` in that case. */
  id?: string;
  heading: string;
  /** One short, striking sentence, rendered as a pull-quote between the heading and the
   * paragraphs. Optional and additive: a report type whose prompt doesn't ask for one, and
   * every report generated before hooks shipped, simply omits it and renders as before. */
  hook?: string;
  paragraphs: string[];
  /** Section-level bullet list, rendered under `paragraphs`. */
  bullets?: string[];
  /** Card-rendered ranked/scored items, rendered under `bullets`. */
  items?: ReportSectionItem[];
}

/** match_report only — one of the 8 life-area severities computed deterministically by the
 * backend (src/lib/astro-engine/matching/match-risks.ts). Frontend never computes this itself. */
export type RiskSeverity = "benefit" | "neutral" | "caution" | "serious";

export const MATCH_RISK_AREA_ORDER = [
  "wealth", "health", "children", "harmony", "career", "timing", "intimacy", "inlaws",
] as const;

export type MatchRiskAreaKey = (typeof MATCH_RISK_AREA_ORDER)[number];

export interface MatchRiskFactor {
  key: MatchRiskAreaKey;
  severity: RiskSeverity;
  score: number;
  evidence: string[];
}

/** match_report's `scores` shape — same fields as kundli_milan's KundliMilanScores plus riskFactors. */
export interface MatchReportScores {
  gunaMilanScore: number;
  gunaMaxScore: number;
  gunaBreakdown: Array<{ name: string; score: number; maxScore: number; description: string }>;
  dashakootaScore: number;
  dashakootaMaxScore: number;
  manglikStatus: { person1: boolean; person2: boolean; cancelled: boolean };
  compatibilityBand: "poor" | "average" | "good" | "excellent";
  riskFactors: MatchRiskFactor[];
}

export type ReportDetailResult =
  | { status: "generating" }
  | { status: "failed"; error: string | null }
  | {
      status: "ready";
      reportKey: string;
      periodMonth: string | null;
      /** Shape differs per reportKey — see components/reports/ReportScoreFacts.tsx for the generic renderer. */
      scores: Record<string, unknown>;
      sections: ReportSection[];
    };

/** GET /v1/reports/stats — real ready generation count per report key, cached server-side ~5 min. */
export type ReportStatsResponse = Record<string, number>;

/** One row of GET /v1/reports/history — the user's own report across ANY type, flat and
 * cross-type-ordered (unlike the catalogue's `purchases`, which are grouped per report type). */
export interface ReportHistoryEntry {
  id: string;
  reportKey: string;
  label: string;
  status: ReportPurchaseStatus;
  periodMonth: string | null;
  createdAt: string;
}

export interface ReportHistoryResponse {
  reports: ReportHistoryEntry[];
}

export const reportsApi = {
  /** The 10-report catalogue for the currently active profile. */
  catalogue: () => request<ReportCatalogueResponse>("/v1/reports", { auth: true }),

  /**
   * Buy a report (one-time, a Kundli Milan report with partner data, or a
   * bundle of months for a monthly report). Throws ApiError on failure —
   * 409 insufficient balance, 403 FEATURE_DISABLED, 400 shape mismatch.
   * Caller should `refresh()` (useAuth) afterward to pick up the real new
   * wallet balance — this response never echoes back the amount charged.
   */
  purchase: (body: PurchaseReportBody) =>
    request<PurchaseReportResponse>("/v1/reports/purchase", { method: "POST", body, auth: true }),

  /** Poll target for a single purchased report. Caller branches on `status`. */
  get: (id: string, language?: string) =>
    request<ReportDetailResult>(
      `/v1/reports/${id}${language ? `?language=${encodeURIComponent(language)}` : ""}`,
      { auth: true },
    ),

  /** Real generated-report counts per key, across all users — never hardcode this client-side. */
  stats: () => request<ReportStatsResponse>("/v1/reports/stats", { auth: true }),

  /** The user's own past reports across every report type, newest first — powers "My Reports". */
  history: () => request<ReportHistoryResponse>("/v1/reports/history", { auth: true }),
};
