import { describe, expect, it } from "vitest";
import { addSeen, hasUnseen, localDayIso, parseSeen } from "./seen";

const TODAY = "2026-10-06";
const store = (date: string, ids: unknown) => JSON.stringify({ date, ids });

describe("localDayIso", () => {
  it("gives the device's calendar day, zero padded", () => {
    expect(localDayIso(new Date(2026, 9, 6))).toBe("2026-10-06");
    expect(localDayIso(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("uses local time, not UTC, just after midnight", () => {
    // 00:30 local on the 6th is still the 5th in UTC for anyone east of Greenwich.
    expect(localDayIso(new Date(2026, 9, 6, 0, 30))).toBe("2026-10-06");
    expect(localDayIso(new Date(2026, 9, 6, 23, 30))).toBe("2026-10-06");
  });
});

describe("parseSeen", () => {
  it("returns nothing for missing, broken or misshapen storage", () => {
    expect(parseSeen(null, TODAY)).toEqual([]);
    expect(parseSeen("not json", TODAY)).toEqual([]);
    expect(parseSeen("{}", TODAY)).toEqual([]);
    expect(parseSeen("null", TODAY)).toEqual([]);
    expect(parseSeen(store(TODAY, "panchang"), TODAY)).toEqual([]);
  });

  it("forgets what was seen on another day", () => {
    expect(parseSeen(store("2026-10-05", ["panchang"]), TODAY)).toEqual([]);
  });

  it("returns today's ids, dropping anything that is not a string", () => {
    expect(parseSeen(store(TODAY, ["panchang", 3, null, "hora"]), TODAY)).toEqual(["panchang", "hora"]);
  });
});

describe("addSeen", () => {
  it("starts a list, adds to it and never repeats an id", () => {
    const one = addSeen(null, TODAY, "panchang");
    expect(JSON.parse(one)).toEqual({ date: TODAY, ids: ["panchang"] });
    const two = addSeen(one, TODAY, "hora");
    expect(JSON.parse(two)).toEqual({ date: TODAY, ids: ["panchang", "hora"] });
    expect(JSON.parse(addSeen(two, TODAY, "panchang"))).toEqual({ date: TODAY, ids: ["panchang", "hora"] });
  });

  it("starts fresh on a new day", () => {
    const yesterday = store("2026-10-05", ["panchang", "hora", "deity", "gita"]);
    expect(JSON.parse(addSeen(yesterday, TODAY, "gita"))).toEqual({ date: TODAY, ids: ["gita"] });
  });
});

describe("hasUnseen", () => {
  it("is true until every story of the day is seen", () => {
    expect(hasUnseen(["panchang"], ["panchang", "hora"])).toBe(true);
    expect(hasUnseen(["panchang", "hora"], ["panchang", "hora"])).toBe(false);
    expect(hasUnseen([], [])).toBe(false);
  });
});
