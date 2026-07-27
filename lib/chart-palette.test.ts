import { describe, it, expect } from "vitest";
import { ageConfidenceColor, AGE_CONFIDENCE_RAMP, TIMING_LEVEL_COLOR } from "./chart-palette";

describe("ageConfidenceColor", () => {
  it("looks up the light-mode hex for each confidence step", () => {
    expect(ageConfidenceColor("NONE", "light")).toBe(AGE_CONFIDENCE_RAMP.light.NONE);
    expect(ageConfidenceColor("HIGH", "light")).toBe(AGE_CONFIDENCE_RAMP.light.HIGH);
  });

  it("looks up the dark-mode hex for each confidence step", () => {
    expect(ageConfidenceColor("NONE", "dark")).toBe(AGE_CONFIDENCE_RAMP.dark.NONE);
    expect(ageConfidenceColor("HIGH", "dark")).toBe(AGE_CONFIDENCE_RAMP.dark.HIGH);
  });

  it("returns a different hex per mode for the same confidence (anchor flips light vs dark)", () => {
    expect(ageConfidenceColor("NONE", "light")).not.toBe(ageConfidenceColor("NONE", "dark"));
  });

  it("every step maps to a distinct hex within a mode", () => {
    const steps: (keyof typeof AGE_CONFIDENCE_RAMP.light)[] = ["NONE", "LOW", "MEDIUM", "HIGH"];
    for (const mode of ["light", "dark"] as const) {
      const hexes = steps.map((s) => ageConfidenceColor(s, mode));
      expect(new Set(hexes).size).toBe(4);
    }
  });
});

describe("TIMING_LEVEL_COLOR", () => {
  it("defines a color for all 3 RankedWindow levels", () => {
    expect(Object.keys(TIMING_LEVEL_COLOR).sort()).toEqual(["HIGH", "LOW", "MEDIUM"]);
  });

  it("keeps LOW achromatic (theme token, not an invented hue)", () => {
    expect(TIMING_LEVEL_COLOR.LOW).toBe("var(--text-muted)");
  });
});
