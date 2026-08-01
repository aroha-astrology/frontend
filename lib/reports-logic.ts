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

/**
 * A monthly report's card state — the SAME four states as a one-time report,
 * scoped to the current calendar month only. Past months are deliberately
 * invisible on the catalogue card: the card offers exactly one action, either
 * reading this month's report or buying it, and rolls over to "buy" on its
 * own the moment the month changes. (Older months stay reachable by their
 * /reports/<id> link — e.g. from a notification — just not listed here.)
 */
export function monthlyCardState(
  purchases: readonly ReportPurchase[],
  month: string = currentMonthKey(),
): OneTimeCardState {
  return deriveOneTimeCardState(purchases.filter((p) => p.periodMonth === month));
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

/** Month name alone (e.g. "August") — the monthly CTA names the month it buys, where the year is noise. Same fixed-locale/UTC convention as formatPeriodMonth. */
export function formatMonthName(periodMonth: string): string {
  const [y, m] = periodMonth.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-IN", { month: "long", timeZone: "UTC" });
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
