/**
 * Pure logic behind the Reports catalogue/purchase UI — kept dependency-free
 * (no React, no lib/api.ts imports) so it's trivially unit-testable with
 * plain vitest in the default "node" environment, matching the convention in
 * lib/period-expiry.ts / lib/admin-format.ts / lib/feature-filter.ts.
 */

// ─── Catalogue filtering / grouping ────────────────────────────────────────

/**
 * The 4 report keys backend's REPORT_CATALOGUE marks `isYearly` (marriage/wealth/true_love/
 * numerology — see ReportDef.isYearly's doc comment there). Duplicated here as a fixed
 * constant rather than fetched, same "recompute-a-fixed-constant client-side" precedent as
 * LoShuGridCard.tsx's GRID_TEMPLATE: the report DETAIL response (GET /v1/reports/:id) carries
 * `reportKey`/`periodMonth` but not an `isYearly` flag (only the catalogue list response
 * does), and the detail page has no reason to fetch the whole catalogue just to label one
 * line. Used only for that cosmetic "Valid till" vs. plain month label (see
 * app/reports/[id]/page.tsx) — every actual purchase/pricing/scoring decision is made
 * server-side off the real ReportDef.isYearly, never off this copy.
 */
export const YEARLY_REPORT_KEYS: ReadonlySet<string> = new Set([
  "marriage",
  "wealth",
  "true_love",
  "numerology",
]);

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
 *
 * Compares on the 'YYYY-MM' PREFIX rather than exact equality: the real API
 * returns `periodMonth` as a Postgres `date` ('YYYY-MM-01'), not the bare
 * 'YYYY-MM' `month` this function is called with — an exact-equality compare
 * silently never matched, so a freshly purchased monthly report never showed
 * "Generating" (the card kept offering "Buy" until the purchase, dedup'd
 * server-side, looked like a no-op click). `month` itself is always a plain
 * 'YYYY-MM' (currentMonthKey()'s own format), so only the purchase side ever
 * needs slicing.
 */
export function monthlyCardState(
  purchases: readonly ReportPurchase[],
  month: string = currentMonthKey(),
): OneTimeCardState {
  return deriveOneTimeCardState(purchases.filter((p) => (p.periodMonth ?? "").slice(0, 7) === month));
}

/** `OneTimeCardState` is a discriminated union, not an object type, so this is an
 * intersection (`&`) rather than an `interface ... extends` — TS can't extend a union. */
export type YearlyCardState = OneTimeCardState & {
  /** 'YYYY-MM-DD' this purchase needs renewing (purchase date + 1 year) — present only when
   * `state` is "ready" or "generating". */
  validUntil?: string;
};

/**
 * A yearly report's card state (marriage/wealth/true_love/numerology — see backend's
 * ReportDef.isYearly doc comment) — the SAME four states as a one-time report, scoped to
 * purchases whose 1-year validity window `[periodMonth, periodMonth + 1 year)` still covers
 * `today`. Once that window passes, the card rolls over to "none" (renewable) on its own,
 * same rollover idea as `monthlyCardState`'s month boundary — just a year wide instead of a
 * month wide, and anchored to the PURCHASE date instead of a shared calendar boundary (every
 * user's renewal date is different, unlike every monthly report resetting on the 1st).
 *
 * `periodMonth` here is the purchase date, not a plain 'YYYY-MM' key (see
 * ReportCatalogueEntry.isYearly's doc comment) — compared as a date STRING throughout (ISO
 * 'YYYY-MM-DD' sorts identically to chronological order), never parsed into a `Date` beyond
 * the one-year offset in `addOneYear`.
 */
export function yearlyCardState(
  purchases: readonly ReportPurchase[],
  today: string = currentDateKey(),
): YearlyCardState {
  const active = purchases.filter((p) => {
    const start = p.periodMonth;
    return !!start && start <= today && addOneYear(start) > today;
  });
  const base = deriveOneTimeCardState(active);
  if (base.state === "none") return base;
  const purchase = active.find((p) => p.id === base.purchaseId);
  return purchase?.periodMonth ? { ...base, validUntil: addOneYear(purchase.periodMonth) } : base;
}

/** Today as a 'YYYY-MM-DD' string. Same UTC-fields convention as `currentMonthKey` above —
 * deterministic in tests, and consistent with this file's existing ~5.5-hour IST/UTC boundary
 * imprecision (accepted there for the same reason: simplicity over exactness at a boundary
 * nobody purchases exactly on). */
export function currentDateKey(from: Date = new Date()): string {
  return `${from.getUTCFullYear()}-${String(from.getUTCMonth() + 1).padStart(2, "0")}-${String(from.getUTCDate()).padStart(2, "0")}`;
}

/** 'YYYY-MM-DD' one calendar year after `dateStr` — Date's own month/day rollover handles
 * Feb 29 on a non-leap target year correctly (rolls to Mar 1), same reasoning as
 * frontend's lib/period-expiry.ts using Date.UTC's normalization for the same purpose.
 * Exported (beyond yearlyCardState's own internal use) so a single report's own detail page
 * can compute the same "purchased on X, valid till X+1y" label without re-deriving it — see
 * app/reports/[id]/page.tsx. */
export function addOneYear(dateStr: string): string {
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  dt.setUTCFullYear(dt.getUTCFullYear() + 1);
  return dt.toISOString().slice(0, 10);
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

/** Formats a full 'YYYY-MM-DD' date as a day + short month + year label (e.g. "18 Aug 2027") —
 * a yearly report's renewal chip needs the DAY (its validity window is anchored to the exact
 * purchase date, unlike a monthly report's shared calendar-month boundary), unlike
 * `formatPeriodMonth` above which only ever receives a 'YYYY-MM' key. Same fixed-locale/UTC
 * convention as the other formatters here. */
export function formatDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1)).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
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

/** Minimal shape sortUnlockedFirst needs. */
interface PurchasableReport {
  isMonthly: boolean;
  isYearly?: boolean;
  purchases: readonly ReportPurchase[];
}

/**
 * Reorders a catalogue list so unlocked entries (a purchase exists — ready,
 * generating, or failed/retry) sort before locked ones (never purchased,
 * state "none"), preserving relative order within each group (Array.sort is
 * stable). Monthly entries use monthlyCardState's current-month scoping and
 * yearly entries use yearlyCardState's rolling-year scoping, so the ordering
 * always matches what each card renders right now — an expired yearly
 * report sorts as locked (renewable), not permanently unlocked.
 */
export function sortUnlockedFirst<T extends PurchasableReport>(reports: readonly T[]): T[] {
  const isLocked = (r: T) => {
    const state = r.isMonthly
      ? monthlyCardState(r.purchases)
      : r.isYearly
        ? yearlyCardState(r.purchases)
        : deriveOneTimeCardState(r.purchases);
    return state.state === "none";
  };
  return [...reports].sort((a, b) => Number(isLocked(a)) - Number(isLocked(b)));
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
