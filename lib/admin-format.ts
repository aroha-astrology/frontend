/**
 * Pure formatting/validation helpers for the /admin dashboard — deliberately
 * dependency-free (no lib/api.ts, no React) so they're testable with plain
 * vitest in the default node environment, matching the convention already
 * established by lib/period-expiry.ts and lib/feature-filter.ts. See
 * lib/admin-format.test.ts for the TDD coverage of every function here.
 */

export type AdminDateRangePreset =
  | "today"
  | "yesterday"
  | "last7d"
  | "last15d"
  | "last30d"
  | "this_month"
  | "last_month"
  | "last90d"
  | "this_quarter"
  | "this_year"
  | "lifetime"
  | "custom";

/** All 12 presets the backend contract (GET /v1/admin/overview|reports) accepts, in display order. */
export const ADMIN_DATE_RANGE_PRESETS: readonly { value: AdminDateRangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7d", label: "Last 7 Days" },
  { value: "last15d", label: "Last 15 Days" },
  { value: "last30d", label: "Last 30 Days" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "last90d", label: "Last 90 Days" },
  { value: "this_quarter", label: "This Quarter" },
  { value: "this_year", label: "This Year" },
  { value: "lifetime", label: "Lifetime" },
  { value: "custom", label: "Custom" },
];

/**
 * Builds the querystring for GET /v1/admin/overview and /v1/admin/reports.
 * `from`/`to` are only meaningful (and only included) when preset === 'custom'
 * — passing them alongside another preset is silently ignored, matching the
 * backend contract ("from/to required only when preset='custom'").
 */
export function buildAdminRangeQuery(preset: AdminDateRangePreset, from?: string, to?: string): string {
  const params = new URLSearchParams({ preset });
  if (preset === "custom") {
    if (from) params.set("from", from);
    if (to) params.set("to", to);
  }
  return params.toString();
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * True when both `from` and `to` are well-formed YYYY-MM-DD strings naming a
 * real calendar date (rejects e.g. "2026-02-31" rather than letting Date
 * silently roll it over to March), and from <= to.
 */
export function isValidCustomRange(from: string, to: string): boolean {
  if (!ISO_DATE_RE.test(from) || !ISO_DATE_RE.test(to)) return false;
  const fromDate = new Date(`${from}T00:00:00Z`);
  const toDate = new Date(`${to}T00:00:00Z`);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) return false;
  if (fromDate.toISOString().slice(0, 10) !== from) return false;
  if (toDate.toISOString().slice(0, 10) !== to) return false;
  return fromDate.getTime() <= toDate.getTime();
}

export interface ParsedRupeeAmount {
  ok: true;
  paise: number;
}
export interface RupeeParseError {
  ok: false;
  error: string;
}

/**
 * Parses a plain (no ₹ symbol) non-negative rupee string like "49.5" or
 * "200" into integer paise. Rejects empty, negative, non-numeric, and
 * more-than-2-decimal-place input.
 */
export function parseRupeeAmount(input: string): ParsedRupeeAmount | RupeeParseError {
  const trimmed = input.trim();
  if (trimmed === "") return { ok: false, error: "Enter an amount" };
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return { ok: false, error: "Enter a valid amount (up to 2 decimal places)" };
  }
  const rupees = Number(trimmed);
  if (!Number.isFinite(rupees)) return { ok: false, error: "Enter a valid amount" };
  return { ok: true, paise: Math.round(rupees * 100) };
}

/** Formats integer paise as a plain (no ₹ symbol) rupee string, suitable as an editable input's default value. */
export function paiseToRupeeInput(paise: number): string {
  const rupees = paise / 100;
  return Number.isInteger(rupees) ? String(rupees) : rupees.toFixed(2);
}

export type WalletAdjustSign = "credit" | "debit";

/**
 * Combines a +/- sign toggle and a magnitude input into the signed
 * `deltaPaise` POST /v1/admin/users/:id/wallet expects. The backend requires
 * a non-zero delta, so a zero magnitude is rejected here too.
 */
export function computeWalletDeltaPaise(
  sign: WalletAdjustSign,
  magnitudeInput: string,
): { ok: true; deltaPaise: number } | RupeeParseError {
  const parsed = parseRupeeAmount(magnitudeInput);
  if (!parsed.ok) return parsed;
  if (parsed.paise === 0) return { ok: false, error: "Amount must be greater than zero" };
  return { ok: true, deltaPaise: sign === "credit" ? parsed.paise : -parsed.paise };
}

/** Validates the required wallet-adjustment note (backend contract: 1-500 chars). */
export function validateWalletNote(note: string): { ok: true } | { ok: false; error: string } {
  const trimmed = note.trim();
  if (trimmed.length === 0) return { ok: false, error: "A note is required" };
  if (trimmed.length > 500) return { ok: false, error: "Note must be 500 characters or fewer" };
  return { ok: true };
}

/** Validates a feature board's inline price editor input — currently just a non-negative rupee amount. */
export function validatePriceInput(input: string): ParsedRupeeAmount | RupeeParseError {
  return parseRupeeAmount(input);
}

export interface ParsedOptionalRupeeAmount {
  ok: true;
  paise: number | null;
}

/**
 * Validates the Features board's "Original Price" (MRP/strikethrough) editor
 * input, which is optional — unlike the mandatory Sale Price editor, a blank
 * field is valid and means "no discount configured" (`paise: null`), clearing
 * any existing override. Any non-blank input is validated exactly like
 * `validatePriceInput`.
 */
export function validateOptionalPriceInput(input: string): ParsedOptionalRupeeAmount | RupeeParseError {
  if (input.trim() === "") return { ok: true, paise: null };
  return parseRupeeAmount(input);
}

/** Returns a new array (never mutates `items`) sorted by `totalPaise` descending. */
export function sortByTotalPaiseDescending<T extends { totalPaise: number }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => b.totalPaise - a.totalPaise);
}

export type AdminFeatureGroupKey = "nav" | "home" | "paid" | "reports" | "panchang";

/** The feature groups the backend contract defines, in the fixed display order every board (main + per-group overrides) uses. */
export const FEATURE_GROUP_ORDER: readonly AdminFeatureGroupKey[] = ["nav", "home", "paid", "reports", "panchang"];

export const FEATURE_GROUP_LABELS: Record<AdminFeatureGroupKey, string> = {
  nav: "Navigation",
  home: "Home",
  paid: "Paid Features",
  reports: "Reports",
  panchang: "Panchang",
};

/**
 * Groups feature rows by their `group`, in FEATURE_GROUP_ORDER; any group
 * name outside that fixed set (a future backend addition this client build
 * doesn't know about yet) is appended afterward, in first-seen order, rather
 * than dropped. Groups with zero rows are omitted entirely.
 */
export function groupFeaturesByGroup<T extends { group: string }>(
  items: readonly T[],
): { group: string; items: T[] }[] {
  const byGroup = new Map<string, T[]>();
  for (const item of items) {
    const list = byGroup.get(item.group);
    if (list) list.push(item);
    else byGroup.set(item.group, [item]);
  }
  const ordered: { group: string; items: T[] }[] = [];
  for (const g of FEATURE_GROUP_ORDER) {
    const list = byGroup.get(g);
    if (list) {
      ordered.push({ group: g, items: list });
      byGroup.delete(g);
    }
  }
  for (const [group, items] of byGroup) {
    ordered.push({ group, items });
  }
  return ordered;
}

/** Validates a new group's name client-side (empty/whitespace-only only — the backend is the source of truth for the case-insensitive-duplicate check). */
export function validateGroupName(name: string): { ok: true } | { ok: false; error: string } {
  if (name.trim().length === 0) return { ok: false, error: "Group name is required" };
  return { ok: true };
}

// ─── LLM cost estimation ────────────────────────────────────────────────────

/**
 * Gemini 3.1 Flash-Lite per-token pricing (USD) and the USD→INR rate used to
 * turn `costByAgent()`'s raw token counts into an estimated ₹ figure for the
 * admin dashboard. The backend deliberately does NOT do this conversion (see
 * ai-usage.repo.ts's costByAgent() doc comment) since pricing/FX can change
 * independently of the stored telemetry — hence it lives here, client-side.
 *
 * These are the same numbers used in jyotish-backend/scripts/report-cost-analysis.ts
 * and jyotish-backend/docs/REPORT_PRICING_AND_COST.md. UPDATE ALL THREE
 * TOGETHER if Gemini's pricing or the USD/INR rate changes.
 */
export const GEMINI_INPUT_USD_PER_MILLION_TOKENS = 0.25;
export const GEMINI_OUTPUT_USD_PER_MILLION_TOKENS = 1.5;
export const USD_TO_INR_RATE = 88;

/**
 * Estimates the ₹ cost (in paise, so it can be passed straight to
 * `formatRupees()`) of one agent's token usage, using the pricing constants
 * above. This is an estimate derived from token counts, not a real ledger
 * entry — unlike other `*Paise` fields in this file, it may be fractional.
 *
 * Only tokens served by the PAID key tier are charged. The free tier costs ₹0
 * however many tokens it burns, so billing every token at list price would
 * overstate real spend by roughly the ratio of free-to-paid traffic — which on
 * an ordinary day is all of it. Rows predating the paid reserve carry no paid
 * tokens and correctly price at zero.
 */
export function estimateLlmCostPaise(usage: {
  paidTokensIn?: number;
  paidTokensOut?: number;
}): number {
  const inputUsd = ((usage.paidTokensIn ?? 0) / 1_000_000) * GEMINI_INPUT_USD_PER_MILLION_TOKENS;
  const outputUsd = ((usage.paidTokensOut ?? 0) / 1_000_000) * GEMINI_OUTPUT_USD_PER_MILLION_TOKENS;
  return (inputUsd + outputUsd) * USD_TO_INR_RATE * 100;
}

/**
 * What the same usage WOULD have cost if none of it had been on the free tier.
 * Shown alongside the real figure so the dashboard can express the value the
 * free key pool is providing, rather than silently reporting ₹0 and looking
 * broken on a normal day.
 */
export function estimateLlmListPricePaise(usage: {
  tokensIn: number;
  tokensOut: number;
}): number {
  const inputUsd = (usage.tokensIn / 1_000_000) * GEMINI_INPUT_USD_PER_MILLION_TOKENS;
  const outputUsd = (usage.tokensOut / 1_000_000) * GEMINI_OUTPUT_USD_PER_MILLION_TOKENS;
  return (inputUsd + outputUsd) * USD_TO_INR_RATE * 100;
}
