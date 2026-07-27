// Pure time-math helpers shared by the Panchang redesign's time-based
// visuals (DayWindowsBar's 24h track, ChoghadiyaTimeline's continuous rail,
// SunMoonTimings' day-length calc). All inputs/outputs are "HH:mm" local
// clock strings, exactly as the backend panchang engine returns them (see
// lib/api.ts's PanchangTimeWindow / ChoghadiyaSlot / HoraSlot).

/** "HH:mm" -> minutes since midnight (e.g. "01:30" -> 90). */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Percent position (0-100) of a clock time within a single midnight-to-
 * midnight day. Only meaningful for windows that never cross midnight —
 * Rahu Kaal / Gulika Kaal / Yamaganda Kaal / Abhijit Muhurta are always
 * carved out of daylight hours, so this is safe for DayWindowsBar.
 */
export function timeToPercent(time: string): number {
  return (timeToMinutes(time) / (24 * 60)) * 100;
}

/**
 * Duration in minutes from `start` to `end`, treating `end <= start` as the
 * window crossing midnight (adds 24h) rather than a negative/zero span.
 * Needed for Choghadiya's later night periods (which legitimately wrap past
 * 00:00) and for SunMoonTimings' day-length/moon-up-time calc.
 */
export function durationMinutes(start: string, end: string): number {
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  return e > s ? e - s : e + 24 * 60 - s;
}

/** e.g. 809 -> "13h 29m", 45 -> "45m", 120 -> "2h". */
export function formatDurationHm(totalMinutes: number): string {
  const mins = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) return `${m}m`;
  if (m <= 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Whether `now` falls within [start, end) — ported from the original
 * app/panchang/page.tsx#isCurrentlyActive (used to highlight the active
 * Choghadiya/Hora slot). Fixed here to also handle `end <= start` as the
 * window crossing midnight: the original compared raw start/end minutes
 * with no wraparound handling, so a Choghadiya night period like
 * "23:12"-"00:38" (formatted mod 24h by the backend, see
 * jyotish-backend/src/lib/astro-engine/panchang/choghadiya.ts#formatTime)
 * could never be marked active — `now >= 1392 && now < 38` is never true.
 * `now` is injectable (default `new Date()`) so this is testable without
 * faking the system clock via a real Date construction.
 */
export function isCurrentlyActive(start: string, end: string, now: Date = new Date()): boolean {
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const startMins = timeToMinutes(start);
  const endMins = timeToMinutes(end);
  if (endMins > startMins) {
    return nowMins >= startMins && nowMins < endMins;
  }
  // Crosses midnight (e.g. start=23:12, end=00:38): active either from
  // `start` through the end of the day, or from midnight up to `end`.
  return nowMins >= startMins || nowMins < endMins;
}
