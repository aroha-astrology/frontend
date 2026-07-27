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
// `preview()` generates a user's real report for free (flagged internally,
// same generator as a purchase) so the report viewer can show it blurred
// after the first section — see `ReportDetailResult`'s `isPreview` field and
// hooks/useReport.ts. Not supported for the two partner-required reports
// (`kundli_milan` / `match_report`). `stats()` backs the real
// "N reports generated" count shown alongside a report's price.

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

export interface ReportSection {
  heading: string;
  paragraphs: string[];
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
      /** true when this row came from POST /v1/reports/preview rather than a real purchase — the report viewer
       * blurs every section after the first and overlays the price + Buy CTA when this is true. A purchase of a
       * previously-previewed report upgrades the SAME row server-side, so this flips to false (and the full
       * content renders normally) the moment the user buys — no second generation wait. */
      isPreview: boolean;
    };

export interface PreviewReportBody {
  reportKey: string;
  /** Omit (or null) for the primary profile. */
  birthProfileId?: string | null;
}

export interface PreviewReportResponse {
  id: string;
  reportKey: string;
  status: ReportPurchaseStatus;
}

/** GET /v1/reports/stats — real ready, non-preview generation count per report key, cached server-side ~5 min. */
export type ReportStatsResponse = Record<string, number>;

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

  /**
   * Generate the user's real report for free (no wallet charge), flagged
   * internally as a preview — same generator as a real purchase. NOT
   * supported for the two partner-required reports (`kundli_milan` /
   * `match_report`); the backend returns 400 for those, so the caller
   * should never show the Preview affordance for them in the first place
   * (see `entry.requiresPartner`).
   */
  preview: (body: PreviewReportBody) =>
    request<PreviewReportResponse>("/v1/reports/preview", { method: "POST", body, auth: true }),

  /** Poll target for a single purchased (or previewed) report. Caller branches on `status`. */
  get: (id: string, language?: string) =>
    request<ReportDetailResult>(
      `/v1/reports/${id}${language ? `?language=${encodeURIComponent(language)}` : ""}`,
      { auth: true },
    ),

  /** Real generated-report counts per key, across all users — never hardcode this client-side. */
  stats: () => request<ReportStatsResponse>("/v1/reports/stats", { auth: true }),
};
