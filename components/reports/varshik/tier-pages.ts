/**
 * Which pages each Varshik Rashifal tier shows. The report is always written in full; a tier only
 * decides which of its pages the reader sees, so there is one set of page builders and no extra
 * calculation. Pages are picked by KEY (not by number): the number of question pages changes from
 * reader to reader, so a page's position is not fixed.
 */
export type VarshikTierSlug = "basic" | "gold" | "complete";

export const VARSHIK_TIER_SLUGS: readonly VarshikTierSlug[] = ["basic", "gold", "complete"];

export function asTierSlug(v: unknown): VarshikTierSlug {
  // A report from before tiers existed was the whole report.
  return v === "basic" || v === "gold" ? v : "complete";
}

/** Snapshot: the charts and the numbers, no written deep dives and no month pages. */
const BASIC_KEYS = new Set([
  "cover", "welcome", "contents",
  "ch1", "glance", "birth", "birthstars", "varsha", "yearlord", "moves", "planets", "doshas", "yogas",
  "ch2", "areas",
  "ch3", "timing",
  "remedies", "card",
  "closing",
]);

/** Whether a tier shows the page with this key. */
export function tierShowsPage(tier: VarshikTierSlug, key: string): boolean {
  if (tier === "complete") return true;
  if (tier === "basic") return BASIC_KEYS.has(key);
  // Gold: everything except Chapter IV, the month-by-month pages.
  return key !== "ch4" && !key.startsWith("month_");
}

/** Keeps the pages a tier shows, in their original order. */
export function filterPagesForTier<T extends { key: string }>(pages: T[], tier: VarshikTierSlug): T[] {
  return pages.filter((p) => tierShowsPage(tier, p.key));
}

/**
 * Chapter numbers as the reader sees them. A tier that drops Chapter IV must not leave a gap
 * (I, II, III, V, VI would be wrong), so the chapters that remain are numbered 1, 2, 3...
 * Returns { originalChapter: shownNumber } for the chapters 1-6 present in `pages`.
 */
export function shownChapterNumbers(pages: { chapter: number }[]): Record<number, number> {
  const present = [...new Set(pages.map((p) => p.chapter).filter((c) => c >= 1))].sort((a, b) => a - b);
  return Object.fromEntries(present.map((c, i) => [c, i + 1]));
}
