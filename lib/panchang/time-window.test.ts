import { describe, it, expect } from "vitest";
import {
  timeToMinutes,
  timeToPercent,
  durationMinutes,
  formatDurationHm,
  isCurrentlyActive,
} from "./time-window";

describe("timeToMinutes", () => {
  it("parses HH:mm into minutes since midnight", () => {
    expect(timeToMinutes("00:00")).toBe(0);
    expect(timeToMinutes("01:30")).toBe(90);
    expect(timeToMinutes("12:00")).toBe(720);
    expect(timeToMinutes("23:59")).toBe(1439);
  });
});

describe("timeToPercent", () => {
  it("maps midnight to 0% and the next midnight boundary to 100%", () => {
    expect(timeToPercent("00:00")).toBe(0);
    expect(timeToPercent("24:00")).toBe(100);
  });

  it("maps noon to 50%", () => {
    expect(timeToPercent("12:00")).toBe(50);
  });

  it("maps a quarter and three-quarters through the day correctly", () => {
    expect(timeToPercent("06:00")).toBe(25);
    expect(timeToPercent("18:00")).toBe(75);
  });
});

describe("durationMinutes", () => {
  it("computes a same-day (non-wrapping) duration", () => {
    expect(durationMinutes("09:00", "10:30")).toBe(90);
    expect(durationMinutes("00:00", "23:59")).toBe(1439);
  });

  it("adds 24h when end <= start (crossing midnight)", () => {
    // A Choghadiya night period like "23:12" -> "00:38".
    expect(durationMinutes("23:12", "00:38")).toBe(86);
    // Exactly wrapping a full day (end === start) — treated as a full 24h span.
    expect(durationMinutes("06:00", "06:00")).toBe(24 * 60);
  });
});

describe("formatDurationHm", () => {
  it("formats hours and minutes together", () => {
    expect(formatDurationHm(809)).toBe("13h 29m");
  });

  it("omits the minutes part when there are none", () => {
    expect(formatDurationHm(120)).toBe("2h");
  });

  it("omits the hours part when under an hour", () => {
    expect(formatDurationHm(45)).toBe("45m");
  });

  it("handles zero", () => {
    expect(formatDurationHm(0)).toBe("0m");
  });
});

describe("isCurrentlyActive", () => {
  it("is true while `now` is inside a same-day (non-wrapping) window", () => {
    const now = new Date(2026, 6, 27, 10, 30);
    expect(isCurrentlyActive("10:00", "11:30", now)).toBe(true);
  });

  it("is false before a window starts or once it has ended", () => {
    const before = new Date(2026, 6, 27, 9, 59);
    const atEnd = new Date(2026, 6, 27, 11, 30);
    expect(isCurrentlyActive("10:00", "11:30", before)).toBe(false);
    expect(isCurrentlyActive("10:00", "11:30", atEnd)).toBe(false); // end is exclusive
  });

  it("is true right at the start boundary (inclusive)", () => {
    const atStart = new Date(2026, 6, 27, 10, 0);
    expect(isCurrentlyActive("10:00", "11:30", atStart)).toBe(true);
  });

  it("handles a window crossing midnight, active before midnight", () => {
    const now = new Date(2026, 6, 27, 23, 30);
    expect(isCurrentlyActive("23:12", "00:38", now)).toBe(true);
  });

  it("handles a window crossing midnight, active after midnight", () => {
    const now = new Date(2026, 6, 27, 0, 20);
    expect(isCurrentlyActive("23:12", "00:38", now)).toBe(true);
  });

  it("handles a window crossing midnight, false outside the range", () => {
    const now = new Date(2026, 6, 27, 12, 0);
    expect(isCurrentlyActive("23:12", "00:38", now)).toBe(false);
  });

  it("defaults `now` to the current time when not provided", () => {
    // Just verify it doesn't throw and returns a boolean with the real clock.
    expect(typeof isCurrentlyActive("00:00", "23:59")).toBe("boolean");
  });
});
