/**
 * Pure logic behind the Reports catalogue/purchase UI — kept dependency-free
 * (no React, no lib/api.ts imports) so it's trivially unit-testable with
 * plain vitest in the default "node" environment, matching the convention in
 * lib/period-expiry.ts / lib/admin-format.ts / lib/feature-filter.ts.
 */

// ─── Monthly bundle price preview ──────────────────────────────────────────

/** The structural base price (₹25/month) the bundle ladder is defined against. */
const BUNDLE_BASE_PAISE = 2500;
const BUNDLE_STEP_PAISE = 2000;
const BUNDLE_CAP_PAISE = 19900;

/**
 * The default bundle-discount ladder for buying `months` consecutive months
 * of a monthly report at once, at the structural base price (₹25/month) —
 * ₹25 for 1, +₹20 per additional month, capped at ₹199 total. This is the
 * backend's own formula; see estimateBundleTotalPaise for how an
 * admin-overridden per-month price scales it.
 */
export function bundleLadderPaise(months: number): number {
  if (months <= 0) return 0;
  return Math.min(BUNDLE_BASE_PAISE + (months - 1) * BUNDLE_STEP_PAISE, BUNDLE_CAP_PAISE);
}

/**
 * Client-side ESTIMATE of the total charge for buying `months` months of a
 * monthly report, given the catalogue's current per-month `pricePaise`
 * (which may have been overridden by an admin away from the ₹25 structural
 * base — see the admin Features board). The server always computes and
 * charges the authoritative amount; this is for display only — label it as
 * an estimate in the UI (e.g. "≈ ₹65 for 3 months"), never a guaranteed
 * exact charge. Rounds once on the final total, not per bundle step.
 */
export function estimateBundleTotalPaise(months: number, pricePaise: number): number {
  const ratio = pricePaise / BUNDLE_BASE_PAISE;
  return Math.round(bundleLadderPaise(months) * ratio);
}

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

/** Every 'YYYY-MM' month already purchased (any status) for a monthly report — used to disable re-selection in the purchase drawer's month picker. */
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

/** The next `count` calendar months starting at `from`'s month (inclusive), as 'YYYY-MM' strings. Uses UTC fields so it's deterministic in tests regardless of the host machine's local timezone. */
export function nextMonths(count: number, from: Date = new Date()): string[] {
  const out: string[] = [];
  let y = from.getUTCFullYear();
  let m = from.getUTCMonth(); // 0-based
  for (let i = 0; i < count; i++) {
    out.push(`${y}-${String(m + 1).padStart(2, "0")}`);
    m++;
    if (m > 11) {
      m = 0;
      y++;
    }
  }
  return out;
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
