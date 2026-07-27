/**
 * Pure logic behind the Reports catalogue/purchase UI — kept dependency-free
 * (no React, no lib/api.ts imports) so it's trivially unit-testable with
 * plain vitest in the default "node" environment, matching the convention in
 * lib/period-expiry.ts / lib/admin-format.ts / lib/feature-filter.ts.
 */

// ─── Catalogue filtering / grouping ────────────────────────────────────────

/** Minimal shape splitReportsByType needs — any richer catalogue entry type satisfies this. */
interface TypedReport {
  isMonthly: boolean;
}

/** Splits the 10-report catalogue into the One Time / Monthly tab lists, preserving backend order within each. */
export function splitReportsByType<T extends TypedReport>(
  reports: readonly T[],
): { oneTime: T[]; monthly: T[] } {
  return {
    oneTime: reports.filter((r) => !r.isMonthly),
    monthly: reports.filter((r) => r.isMonthly),
  };
}

export interface ReportPurchase {
  id: string;
  periodMonth: string | null;
  status: "generating" | "ready" | "failed";
}

export type OneTimeCardState =
  | { state: "none" }
  | { state: "generating"; purchaseId: string }
  | { state: "ready"; purchaseId: string }
  | { state: "failed"; purchaseId: string };

/**
 * Which state (and which purchase id) a one-time report's card should show.
 * A "Retry" appends a new purchase row rather than mutating the failed one
 * (matching this app's other paid-feature retry UX), so several rows can
 * exist for the same report key. Priority is ready > generating > failed;
 * ties within the same priority take the LAST (most recently appended, i.e.
 * latest attempt) row.
 */
export function deriveOneTimeCardState(purchases: readonly ReportPurchase[]): OneTimeCardState {
  const lastOfStatus = (status: ReportPurchase["status"]): ReportPurchase | null => {
    for (let i = purchases.length - 1; i >= 0; i--) {
      if (purchases[i].status === status) return purchases[i];
    }
    return null;
  };
  const ready = lastOfStatus("ready");
  if (ready) return { state: "ready", purchaseId: ready.id };
  const generating = lastOfStatus("generating");
  if (generating) return { state: "generating", purchaseId: generating.id };
  const failed = lastOfStatus("failed");
  if (failed) return { state: "failed", purchaseId: failed.id };
  return { state: "none" };
}

/** Every 'YYYY-MM' month already purchased (any status) for a monthly report — used by the purchase drawer to detect whether the current month is already purchased, and by the report cards for their purchased-month chips. */
export function purchasedMonthSet(purchases: readonly ReportPurchase[]): Set<string> {
  return new Set(
    purchases.filter((p): p is ReportPurchase & { periodMonth: string } => p.periodMonth !== null).map((p) => p.periodMonth),
  );
}

export interface MonthChip {
  periodMonth: string;
  status: ReportPurchase["status"];
  purchaseId: string;
}

/** Chip list for a monthly report's card — one per purchased month, sorted chronologically ('YYYY-MM' sorts lexicographically = chronologically). */
export function purchasedMonthChips(purchases: readonly ReportPurchase[]): MonthChip[] {
  return purchases
    .filter((p): p is ReportPurchase & { periodMonth: string } => p.periodMonth !== null)
    .map((p) => ({ periodMonth: p.periodMonth, status: p.status, purchaseId: p.id }))
    .sort((a, b) => a.periodMonth.localeCompare(b.periodMonth));
}

/**
 * Whether a monthly report's card CTA should read "Add months" rather than
 * "Buy" — true only when the user actually owns a month (`ready`) or is
 * waiting on one (`generating`). Deliberately NOT based on
 * `purchasedMonthChips().length > 0`: that list intentionally still includes
 * `failed` purchases (so the chip row's Retry affordance stays reachable),
 * but a purchase that only ever failed shouldn't permanently flip the button
 * away from "Buy" for a user who owns nothing.
 */
export function hasActiveMonthlyPurchase(purchases: readonly ReportPurchase[]): boolean {
  return purchases.some((p) => p.status === "ready" || p.status === "generating");
}

/**
 * The current calendar month as a 'YYYY-MM' string — monthly reports are
 * purchased for "this month" only (no month picker, see
 * ReportPurchaseDrawer). Uses UTC fields so it's deterministic in tests
 * regardless of the host machine's local timezone.
 */
export function currentMonthKey(from: Date = new Date()): string {
  return `${from.getUTCFullYear()}-${String(from.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Formats a 'YYYY-MM' periodMonth as a full month + year label (e.g.
 * "August 2026"). Matches the rest of the app's date-formatting convention
 * (see app/kundli/page.tsx, components/horoscope/DashaChapterCard.tsx): dates
 * are rendered in a fixed locale, not translated per UI language. `timeZone:
 * "UTC"` keeps this deterministic regardless of the host machine's local
 * timezone, since the Date is constructed at UTC midnight.
 */
export function formatPeriodMonth(periodMonth: string): string {
  const [y, m] = periodMonth.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export interface DiscountInfo {
  /** Rounded whole-number percentage off, e.g. 70 for "70% off". */
  percentOff: number;
}

/**
 * Whether a report's discount treatment (strikethrough original price + "X%
 * off" badge) should render, and the rounded percentage to show if so.
 * Returns null — "no discount configured, render the price plainly" — when
 * `originalPricePaise` is absent or not STRICTLY greater than `pricePaise`;
 * never fabricates a discount from any other price field. Shared by every
 * surface that renders a report's price (components/reports/DiscountPrice.tsx)
 * so the threshold/rounding rule lives in exactly one place.
 */
export function computeDiscount(pricePaise: number, originalPricePaise: number | null): DiscountInfo | null {
  if (originalPricePaise === null || originalPricePaise <= pricePaise) return null;
  return { percentOff: Math.round((1 - pricePaise / originalPricePaise) * 100) };
}

// ─── Preview (generate-and-blur) ───────────────────────────────────────────

/** Minimal shape canPreviewReport needs — any richer catalogue entry type satisfies this. */
interface PreviewableReport {
  requiresPartner: boolean;
}

/**
 * Whether the Preview affordance should show for a catalogue entry. The
 * backend's POST /v1/reports/preview 400s for the two partner-required
 * report types (kundli_milan / match_report) since there's no "the user's
 * own free real report" to generate without partner birth data — this is
 * exactly the same `requiresPartner` flag the purchase drawer already
 * branches on for the partner-birth-detail form, so no new catalogue field
 * is needed.
 */
export function canPreviewReport(entry: PreviewableReport): boolean {
  return !entry.requiresPartner;
}

/**
 * Splits a ready report's sections into what a preview shows in full vs.
 * behind the blur — the first section/chapter renders clearly, everything
 * after it is blurred with the price + Buy CTA overlaid (see
 * app/reports/[id]/page.tsx). A real purchase (`isPreview: false`, including
 * an upgraded preview row) always gets every section back in `visible` —
 * this is the one function that decides the blur boundary, kept pure and
 * dependency-free so it's trivially unit-testable.
 */
export function splitPreviewSections<T>(
  sections: readonly T[],
  isPreview: boolean,
): { visible: T[]; blurred: T[] } {
  if (!isPreview) return { visible: [...sections], blurred: [] };
  return { visible: sections.slice(0, 1), blurred: sections.slice(1) };
}

/** Minimal shape filterVisibleReports needs. */
interface VisibilityReport {
  key: string;
  enabled: boolean;
}

/**
 * Keeps only catalogue entries that are visible: BOTH the catalogue's own
 * `enabled` field (the source of truth once fetched) AND the admin feature
 * toggle for that specific report (`reports.<key>`, checked via the same
 * `isFeatureEnabled` callback shape as lib/feature-filter.ts's
 * `filterByFeature`, so it composes with `resolveFeature` and its fail-open
 * default the same way every other feature-gated list in this app does).
 */
export function filterVisibleReports<T extends VisibilityReport>(
  reports: readonly T[],
  isFeatureEnabled: (featureKey: string) => boolean,
): T[] {
  return reports.filter((r) => r.enabled && isFeatureEnabled(`reports.${r.key}`));
}
