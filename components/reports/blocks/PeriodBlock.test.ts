import { describe, it, expect } from "vitest";
import { PERIOD_TONE_STYLES, type PeriodTone } from "./PeriodBlock";

/**
 * Copied verbatim from TimingWindowsCard.tsx's LEVEL_STYLES (the
 * HIGH/MEDIUM/LOW confidence convention, components/reports/
 * TimingWindowsCard.tsx:11-15) and DecadeArcCard.tsx's TONE_STYLES (the
 * favorable/mixed/challenging convention, components/reports/
 * DecadeArcCard.tsx:17-21). This test guards PeriodBlock's badge colors
 * against silently drifting away from those two already-shipped components,
 * which is the whole point of reusing rather than re-deriving them.
 */
const EXPECTED_BADGES: Record<PeriodTone, string> = {
  HIGH: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
  MEDIUM: "border-amber-500/25 bg-amber-500/10 text-amber-400",
  LOW: "border-border bg-muted/10 text-muted",
  favorable: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
  mixed: "border-amber-500/25 bg-amber-500/10 text-amber-400",
  challenging: "border-red-500/25 bg-red-500/10 text-red-400",
};

describe("PERIOD_TONE_STYLES", () => {
  it("has an entry for every PeriodTone value", () => {
    expect(Object.keys(PERIOD_TONE_STYLES).sort()).toEqual(
      ["HIGH", "MEDIUM", "LOW", "favorable", "mixed", "challenging"].sort(),
    );
  });

  it("reuses the exact badge classes already shipped in TimingWindowsCard/DecadeArcCard, not new colors", () => {
    for (const tone of Object.keys(EXPECTED_BADGES) as PeriodTone[]) {
      expect(PERIOD_TONE_STYLES[tone].badge).toBe(EXPECTED_BADGES[tone]);
    }
  });

  it("gives every tone a non-empty left-rule class", () => {
    for (const tone of Object.keys(PERIOD_TONE_STYLES) as PeriodTone[]) {
      expect(PERIOD_TONE_STYLES[tone].rule.length).toBeGreaterThan(0);
    }
  });

  it("keeps LOW neutral/muted, distinct from the red 'challenging' family", () => {
    expect(PERIOD_TONE_STYLES.LOW.badge).not.toContain("red");
    expect(PERIOD_TONE_STYLES.LOW.rule).not.toContain("red");
  });

  it("gives HIGH and favorable the identical color family (both are the 'good' end of their own vocabulary)", () => {
    expect(PERIOD_TONE_STYLES.HIGH.badge).toBe(PERIOD_TONE_STYLES.favorable.badge);
    expect(PERIOD_TONE_STYLES.MEDIUM.badge).toBe(PERIOD_TONE_STYLES.mixed.badge);
  });
});
