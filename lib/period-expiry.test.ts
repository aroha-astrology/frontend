import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { istToday, currentPeriodKey, periodExpiresAt, APP_TZ } from "./period-expiry";

/**
 * These tests pin the *instant* (an absolute epoch, via vi.setSystemTime) and
 * assert against hand-computed IST wall-clock expectations — they do NOT rely
 * on the test runner's host timezone (see period-expiry.ts's top comment for
 * why: Node's TZ can't be reliably forced mid-run, especially on Windows CI).
 * Every instant below is written as a UTC ms epoch derived by hand from a
 * known IST wall-clock time (IST = UTC+5:30, no DST) so the expected value in
 * each assertion is independently computed, not just round-tripped through
 * the same Date.UTC/offset arithmetic the implementation uses.
 */

/** UTC epoch ms for an IST wall-clock instant Y-M-D HH:mm (IST = UTC+5:30). */
function istInstant(y: number, m: number, d: number, hh: number, mm: number): number {
  return Date.UTC(y, m - 1, d, hh, mm) - 5.5 * 3_600_000;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("APP_TZ", () => {
  it("is Asia/Kolkata", () => {
    expect(APP_TZ).toBe("Asia/Kolkata");
  });
});

describe("istToday / currentPeriodKey('daily')", () => {
  it("stays on the same IST calendar day just before midnight", () => {
    // 2026-07-21 23:59 IST
    vi.setSystemTime(new Date(istInstant(2026, 7, 21, 23, 59)));
    expect(istToday()).toBe("2026-07-21");
    expect(currentPeriodKey("daily")).toBe("2026-07-21");
  });

  it("rolls to the next IST calendar day just after midnight", () => {
    // 2026-07-22 00:01 IST
    vi.setSystemTime(new Date(istInstant(2026, 7, 22, 0, 1)));
    expect(istToday()).toBe("2026-07-22");
    expect(currentPeriodKey("daily")).toBe("2026-07-22");
  });

  it("gives different daily periodKeys either side of IST midnight", () => {
    vi.setSystemTime(new Date(istInstant(2026, 7, 21, 23, 59)));
    const before = currentPeriodKey("daily");
    vi.setSystemTime(new Date(istInstant(2026, 7, 22, 0, 1)));
    const after = currentPeriodKey("daily");
    expect(before).not.toBe(after);
  });

  it("is unaffected by the instant's UTC calendar day differing from its IST one", () => {
    // 2026-07-21 23:59 IST is still 2026-07-21T18:29:00Z in UTC (same UTC day here),
    // but 2026-07-22 00:01 IST is 2026-07-21T18:31:00Z — UTC day is still the 21st
    // while the IST day has already rolled to the 22nd. This is exactly the
    // "device outside IST" case the brief calls out Date.UTC(y,m,d) (local-ish)
    // must not be used for.
    const instant = istInstant(2026, 7, 22, 0, 1);
    vi.setSystemTime(new Date(instant));
    expect(new Date(instant).getUTCDate()).toBe(21); // UTC day is still the 21st
    expect(istToday()).toBe("2026-07-22"); // but IST day has rolled
  });
});

describe("currentPeriodKey('tomorrow') / periodExpiresAt", () => {
  it("tomorrow's periodKey is the IST calendar day after today's", () => {
    vi.setSystemTime(new Date(istInstant(2026, 7, 21, 12, 0)));
    expect(currentPeriodKey("tomorrow")).toBe("2026-07-22");
  });

  it("tomorrow's expiry equals daily's expiry for the same instant (both are 'next IST midnight')", () => {
    vi.setSystemTime(new Date(istInstant(2026, 7, 21, 9, 15)));
    expect(periodExpiresAt("tomorrow")).toBe(periodExpiresAt("daily"));
    // And that shared instant is exactly IST midnight starting 2026-07-22.
    expect(periodExpiresAt("daily")).toBe(istInstant(2026, 7, 22, 0, 0));
  });
});

describe("currentPeriodKey('weekly') / periodExpiresAt", () => {
  // 2026-01-04 is a Sunday (IST), 2026-01-05 is the following Monday.
  it("gives different weekly periodKeys either side of the Sunday->Monday IST midnight", () => {
    vi.setSystemTime(new Date(istInstant(2026, 1, 4, 23, 59)));
    const sunday = currentPeriodKey("weekly");
    vi.setSystemTime(new Date(istInstant(2026, 1, 5, 0, 1)));
    const monday = currentPeriodKey("weekly");
    expect(sunday).not.toBe(monday);
  });

  it("expiry for the Sunday-night instant is that very midnight, not a week later", () => {
    vi.setSystemTime(new Date(istInstant(2026, 1, 4, 23, 59)));
    expect(periodExpiresAt("weekly")).toBe(istInstant(2026, 1, 5, 0, 0));
  });

  it("Monday's weekly periodKey is Monday's own date (mondayOf a Monday is itself)", () => {
    vi.setSystemTime(new Date(istInstant(2026, 1, 5, 0, 1)));
    expect(currentPeriodKey("weekly")).toBe("2026-01-05");
  });

  it("stays constant across the week and expires at the *next* Monday's midnight", () => {
    // Wednesday mid-week — should still key on Monday 2026-01-05, and expire
    // a next Monday (2026-01-12) IST midnight away.
    vi.setSystemTime(new Date(istInstant(2026, 1, 7, 15, 0)));
    expect(currentPeriodKey("weekly")).toBe("2026-01-05");
    expect(periodExpiresAt("weekly")).toBe(istInstant(2026, 1, 12, 0, 0));
  });
});

describe("currentPeriodKey('monthly') / periodExpiresAt — month/leap-year rollover", () => {
  it("Feb 28 2026 (non-leap, last day of Feb) rolls to March 1 2026 IST midnight", () => {
    vi.setSystemTime(new Date(istInstant(2026, 2, 28, 23, 59)));
    expect(currentPeriodKey("monthly")).toBe("2026-02");
    expect(periodExpiresAt("monthly")).toBe(istInstant(2026, 3, 1, 0, 0));
  });

  it("Feb 29 2028 (leap year, last day of Feb) rolls to March 1 2028 IST midnight", () => {
    vi.setSystemTime(new Date(istInstant(2028, 2, 29, 23, 59)));
    expect(currentPeriodKey("monthly")).toBe("2028-02");
    expect(periodExpiresAt("monthly")).toBe(istInstant(2028, 3, 1, 0, 0));
  });

  it("December rolls the month key into January of the next year", () => {
    vi.setSystemTime(new Date(istInstant(2026, 12, 15, 12, 0)));
    expect(currentPeriodKey("monthly")).toBe("2026-12");
    expect(periodExpiresAt("monthly")).toBe(istInstant(2027, 1, 1, 0, 0));
  });
});

describe("currentPeriodKey('yearly') / periodExpiresAt — year rollover", () => {
  it("Dec 31 23:59 IST and Jan 1 00:01 IST have different yearly periodKeys", () => {
    vi.setSystemTime(new Date(istInstant(2026, 12, 31, 23, 59)));
    const y1 = currentPeriodKey("yearly");
    vi.setSystemTime(new Date(istInstant(2027, 1, 1, 0, 1)));
    const y2 = currentPeriodKey("yearly");
    expect(y1).toBe("2026");
    expect(y2).toBe("2027");
    expect(y1).not.toBe(y2);
  });

  it("periodExpiresAt('yearly') for the Dec-31 instant equals epoch ms of Jan 1 00:00 IST", () => {
    vi.setSystemTime(new Date(istInstant(2026, 12, 31, 23, 59)));
    expect(periodExpiresAt("yearly")).toBe(istInstant(2027, 1, 1, 0, 0));
  });
});
