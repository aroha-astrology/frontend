/**
 * IST calendar-period math for the client-side content cache (see lib/cache.ts).
 *
 * The backend generates horoscope/forecast/panchang content once per IST
 * calendar period and serves the same row until the period rolls over (see
 * jyotish-backend/src/modules/horoscope/horoscope.service.ts — `dateInTz`,
 * `todayForApp`, `periodKeyFor`, `currentPeriodStart`, `mondayOf`). This
 * module mirrors that exact math on the client so a cache key naturally
 * misses the instant the backend would have started serving a new row —
 * without this file, the client would have to guess an expiry, and any
 * mismatch would either serve stale content past rollover or refetch
 * needlessly before it.
 *
 * The one formula everything reduces to: IST midnight of IST calendar date
 * `Y-M-D` is `Date.UTC(Y, M-1, D) - 5.5 * 3_600_000`. IST is a fixed
 * UTC+5:30 offset with no DST, so that subtraction is exact year-round.
 * `Date.UTC` normalizes out-of-range month/day components (month 13 rolls
 * into next year, day 0/32 rolls across a month boundary), which is what
 * gives correct month-end/leap-year/year-rollover handling for free below —
 * deliberately never `new Date(y, m, d)` (constructs in the *host device's*
 * local timezone, which would compute the wrong IST calendar day for any
 * user outside IST, e.g. an NRI on a US device).
 */

/** The app's reference timezone — all cached content is dated by the IST calendar day/week/month/year. */
export const APP_TZ = "Asia/Kolkata";

/** Calendar date (YYYY-MM-DD) for an instant, in the given tz. Mirrors the backend's `dateInTz`. */
function dateInTz(d: Date, tz: string = APP_TZ): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Today's date in IST. Mirrors the backend's `todayForApp`. */
export function istToday(): string {
  return dateInTz(new Date());
}

export type Period = "daily" | "tomorrow" | "weekly" | "monthly" | "yearly";

/** Parses a YYYY-MM-DD string into its numeric parts. */
function parts(dateStr: string): [number, number, number] {
  return dateStr.split("-").map(Number) as [number, number, number];
}

/**
 * YYYY-MM-DD for the calendar day `days` after `dateStr`. Pure calendar
 * arithmetic on an abstract date string (not tied to any real timezone) —
 * mirrors the backend's `addOneDay`, generalized to any day offset so it can
 * also compute "the Monday after this Monday" for the weekly-expiry case
 * below. Using Date.UTC + toISOString here (rather than the IST-midnight
 * formula) is intentional: this function moves a calendar-date *string*
 * forward, it never touches a real instant.
 */
function addDays(dateStr: string, days: number): string {
  const [y, m, d] = parts(dateStr);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** Monday (ISO week start) of the week containing `dateStr`, as YYYY-MM-DD. Mirrors the backend's `mondayOf`. */
function mondayOf(dateStr: string): string {
  const [y, m, d] = parts(dateStr);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = dt.getUTCDay(); // 0=Sun..6=Sat
  dt.setUTCDate(dt.getUTCDate() + (dow === 0 ? -6 : 1 - dow));
  return dt.toISOString().slice(0, 10);
}

/**
 * Epoch ms of IST midnight (00:00:00.000) on calendar date `y-m-d`. `m` is
 * 1-based (January = 1) to match the YYYY-MM-DD strings used everywhere else
 * in this file. See the module doc comment for why this single subtraction
 * is exact and why out-of-range `m`/`d` (e.g. month 13, day 0) are not bugs —
 * `Date.UTC` normalizes them into the correct neighboring month/year.
 */
function istMidnightOf(y: number, m: number, d: number): number {
  return Date.UTC(y, m - 1, d) - 5.5 * 3_600_000;
}

/**
 * The cache-relevant key for `period`'s *currently active* row, as of now.
 * Mirrors the backend's `periodKeyFor(period, currentPeriodStart(period))`:
 * daily/tomorrow key on their own IST calendar date (already unique per
 * period so no truncation), weekly keys on the Monday of the current IST
 * ISO week, monthly truncates to YYYY-MM, yearly truncates to YYYY.
 */
export function currentPeriodKey(period: Period): string {
  const today = istToday();
  switch (period) {
    case "daily":
      return today;
    case "tomorrow":
      return addDays(today, 1);
    case "weekly":
      return mondayOf(today);
    case "monthly":
      return today.slice(0, 7);
    case "yearly":
      return today.slice(0, 4);
  }
}

/**
 * Epoch ms of the instant `currentPeriodKey(period)` changes value — i.e.
 * the moment a cache entry keyed on today's `currentPeriodKey(period)`
 * becomes stale and must miss.
 *
 * `daily` and `tomorrow` both expire at the very next IST midnight: today's
 * "tomorrow" is itself a moving target that shifts forward every midnight
 * (it always means "the day after whatever today is"), so its cache entry
 * goes stale at exactly the same instant as today's "daily" entry — this is
 * NOT a 48h TTL, both are 1-day windows anchored to the same rollover.
 */
export function periodExpiresAt(period: Period): number {
  const today = istToday();
  switch (period) {
    case "daily":
    case "tomorrow": {
      const [y, m, d] = parts(addDays(today, 1));
      return istMidnightOf(y, m, d);
    }
    case "weekly": {
      // currentPeriodKey('weekly') is the Monday of *this* IST week and stays
      // constant through the whole week (including the Monday itself, since
      // mondayOf(aMonday) === aMonday) — it only changes at the following
      // Monday's IST midnight, i.e. exactly 7 days after this week's Monday.
      const thisMonday = mondayOf(today);
      const [y, m, d] = parts(addDays(thisMonday, 7));
      return istMidnightOf(y, m, d);
    }
    case "monthly": {
      // Passing month 13 deliberately relies on Date.UTC's overflow
      // normalization (see module doc comment) to roll December into
      // January of the next year without a separate branch.
      const [y, m] = parts(today);
      return istMidnightOf(y, m + 1, 1);
    }
    case "yearly": {
      const [y] = parts(today);
      return istMidnightOf(y + 1, 1, 1);
    }
  }
}
