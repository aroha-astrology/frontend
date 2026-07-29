import { describe, it, expect } from "vitest";
import { filterInformativeReasoning } from "./TimingWindowsCard";

describe("filterInformativeReasoning", () => {
  it("drops the near-guaranteed non-informative Yogini/transit boilerplate, keeping the real Vimshottari anchor fact", () => {
    const reasoning = [
      "Vimshottari anchor: Mercury pratyantardasha (within Saturn major period).",
      "Yogini alignment: could not determine active Yogini period.",
      "Transit gating: Jupiter position unknown.",
    ];
    expect(filterInformativeReasoning(reasoning)).toEqual([
      "Vimshottari anchor: Mercury pratyantardasha (within Saturn major period).",
    ]);
  });

  it("keeps an informative aligned line (e.g. a real Yogini or transit match)", () => {
    const reasoning = [
      "Vimshottari anchor: Venus antardasha (within Venus major period).",
      "Yogini alignment: Bhadrika period lord (Venus) is a primary significator.",
      "Saturn transit triggers relevant houses (7).",
    ];
    expect(filterInformativeReasoning(reasoning)).toEqual(reasoning);
  });

  it("drops the 'too far out to score' and 'does not strongly trigger' transit variants", () => {
    const reasoning = [
      "Vimshottari anchor: Ketu antardasha (within Ketu major period).",
      "Yogini alignment: could not determine active Yogini period.",
      "Transit gating: window is too far out for today's transit to be a meaningful signal (not scored).",
    ];
    expect(filterInformativeReasoning(reasoning)).toEqual([
      "Vimshottari anchor: Ketu antardasha (within Ketu major period).",
    ]);
  });

  it("returns an empty array unchanged for empty input", () => {
    expect(filterInformativeReasoning([])).toEqual([]);
  });
});
