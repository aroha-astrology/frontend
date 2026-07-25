// Typed client for the backend's Reports feature (10 named AI-generated
// reports — 6 one-time, 4 monthly — wallet-purchased, profile-scoped,
// translate-on-read per language). Built on lib/api.ts's exported
// `request<T>()` exactly like every other typed client in this app.
//
// Unlike kundli/horoscope/gemstone, every status this backend returns
// (`generating` / `failed` / `ready`) comes back as a plain 200 — there's no
// 202/403 status-code dance to unwrap here, so a direct `request<T>()` call
// is enough for all three endpoints.

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
};
