import { describe, expect, it } from "vitest";
import { HOOKS, clockOf, codeMessage, hookMeta, inMinutes } from "./hooks-copy";

describe("hooks-copy", () => {
  it("has the eight hooks, four for each look, each with its own switch and route", () => {
    expect(HOOKS).toHaveLength(8);
    expect(HOOKS.filter((h) => h.look === "vedic").map((h) => h.key)).toEqual(["kundliRahasya", "shubhLabh", "gharKavach", "sankalpDiya"]);
    expect(HOOKS.filter((h) => h.look === "cosmic").map((h) => h.key)).toEqual(["cosmicReceipts", "textTiming", "sleepSync", "mysteryDrop"]);
    expect(new Set(HOOKS.map((h) => h.slug)).size).toBe(8);
    expect(new Set(HOOKS.map((h) => h.homeId)).size).toBe(8);
    for (const h of HOOKS) expect(h.feature).toBe(`hooks.${h.key}`);
    expect(hookMeta("mysteryDrop").slug).toBe("mystery");
  });

  it("never mentions AI in any name or tagline", () => {
    expect(JSON.stringify(HOOKS)).not.toMatch(/\bAI\b/);
  });

  it("clockOf wraps past midnight", () => {
    expect(clockOf(370)).toBe("06:10");
    expect(clockOf(1500)).toBe("01:00");
    expect(clockOf(0)).toBe("00:00");
  });

  it("inMinutes", () => {
    expect(inMinutes(14)).toBe("in 14 min");
    expect(inMinutes(60)).toBe("in 1 h");
    expect(inMinutes(134)).toBe("in 2 h 14 min");
  });

  it("every server code has a sentence, and unknown ones a safe default", () => {
    for (const c of ["INSUFFICIENT_CREDITS", "NOT_YET", "WINDOW_PASSED", "NO_CHART", "NO_FAMILY", "ALREADY_MARKED", "WEEK_LOCKED"]) {
      expect(codeMessage(c).length).toBeGreaterThan(10);
    }
    expect(codeMessage("ZZZ")).toBe(codeMessage(null));
  });
});
