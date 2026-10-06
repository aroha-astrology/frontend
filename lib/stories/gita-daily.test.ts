import { describe, expect, it } from "vitest";
import { dayNumber, pickDailyVerse } from "./gita-daily";

const verse = (id: string, tags: string[] = ["peace"]) => ({ id, tags });

describe("dayNumber", () => {
  it("counts whole days from 1970-01-01", () => {
    expect(dayNumber("1970-01-01")).toBe(0);
    expect(dayNumber("1970-01-02")).toBe(1);
    expect(dayNumber("2026-10-07") - dayNumber("2026-10-06")).toBe(1);
  });
});

describe("pickDailyVerse", () => {
  const verses = Array.from({ length: 40 }, (_, i) => verse(`v${i}`));

  it("gives everyone the same verse on the same day", () => {
    expect(pickDailyVerse(verses, "2026-10-06")).toBe(pickDailyVerse(verses, "2026-10-06"));
  });

  it("changes every day and does not repeat within the pool's length", () => {
    const start = dayNumber("2026-10-06");
    const picked = Array.from({ length: verses.length }, (_, i) => {
      const date = new Date((start + i) * 86_400_000).toISOString().slice(0, 10);
      return pickDailyVerse(verses, date)!.id;
    });
    expect(new Set(picked).size).toBe(verses.length);
    expect(picked[0]).not.toBe(picked[1]);
  });

  it("skips the narrative verses that have no need-tag", () => {
    const mixed = [verse("narrative-1", []), verse("tagged"), verse("narrative-2", [])];
    for (const date of ["2026-10-06", "2026-10-07", "2026-10-08"]) {
      expect(pickDailyVerse(mixed, date)?.id).toBe("tagged");
    }
  });

  it("still picks one when no verse is tagged, and nothing from an empty list", () => {
    expect(pickDailyVerse([verse("a", []), verse("b", [])], "2026-10-06")).not.toBeNull();
    expect(pickDailyVerse([], "2026-10-06")).toBeNull();
  });
});
