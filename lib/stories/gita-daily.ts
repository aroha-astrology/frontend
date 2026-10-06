/** Whole days from 1970-01-01 to `isoDate` ("YYYY-MM-DD"). */
export function dayNumber(isoDate: string): number {
  const [year = 1970, month = 1, day = 1] = isoDate.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

/**
 * The Gita verse for `isoDate`: the same for everyone that day, a different
 * one the next. Chosen from the verses that carry a need-tag ("for anxiety",
 * "for focus"); the untagged ones are the battlefield narrative, which says
 * little on its own. Stepping by a prime keeps tomorrow's verse from being
 * today's neighbour.
 */
export function pickDailyVerse<T extends { tags: string[] }>(verses: readonly T[], isoDate: string): T | null {
  const tagged = verses.filter((v) => v.tags.length > 0);
  const pool = tagged.length > 0 ? tagged : verses;
  if (pool.length === 0) return null;
  return pool[(dayNumber(isoDate) * 7919) % pool.length] ?? null;
}
