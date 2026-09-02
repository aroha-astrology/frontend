/**
 * Coarse time-of-day windows for readers who don't know their birth time.
 *
 * Onboarding lets them name the part of the day they were born in instead of a
 * clock time; we send that window's MIDPOINT as `timeOfBirth` alongside
 * `birthTimeAccuracy: 'unknown'`. The window itself is deliberately NOT stored
 * — the buckets are contiguous and every midpoint falls inside its own bucket,
 * so `birthTimeWindowFor(timeOfBirth)` recovers it exactly for display.
 *
 * Duplicated in the backend at `src/lib/birth-time-window.ts` — same house
 * pattern as the Vastu rules. Keep the two in sync.
 *
 * Labels are translated via `onboarding.window.<key>`; only the digit range is
 * language-neutral and lives here.
 */

/** Contiguous, gap-free cover of the 24h clock. `mid` is what gets submitted. */
export const BIRTH_TIME_WINDOWS = [
  { key: "late_night", startH: 0, endH: 3, mid: "01:30", range: "00:00 – 03:00" },
  { key: "early_morning", startH: 3, endH: 6, mid: "04:30", range: "03:00 – 06:00" },
  { key: "morning", startH: 6, endH: 12, mid: "09:00", range: "06:00 – 12:00" },
  { key: "afternoon", startH: 12, endH: 16, mid: "14:00", range: "12:00 – 16:00" },
  { key: "evening", startH: 16, endH: 20, mid: "18:00", range: "16:00 – 20:00" },
  { key: "night", startH: 20, endH: 24, mid: "22:00", range: "20:00 – 00:00" },
] as const;

export type BirthTimeWindow = (typeof BIRTH_TIME_WINDOWS)[number];

/**
 * Bucket an `HH:mm` / `HH:mm:ss` clock time into its window. Null only for a
 * missing or unparseable value.
 */
export function birthTimeWindowFor(time: string | null | undefined): BirthTimeWindow | null {
  if (!time) return null;
  const hour = Number(time.split(":")[0]);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;
  return BIRTH_TIME_WINDOWS.find((w) => hour >= w.startH && hour < w.endH) ?? null;
}
