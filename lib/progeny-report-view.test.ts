import { describe, it, expect } from "vitest";
import { buildProgenyView, SECTION_ICON } from "./progeny-report-view";

/** A representative progeny `scores` bag, shaped as the backend returns it
 * (see jyotish-backend's astro-engine/reports/progeny.ts). */
function scores(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    motherPromise: {
      band: "Strong",
      sphuta: { kind: "kshetra", rasi: "Taurus", navamsa: "Capricorn", strength: "strong" },
      putraTithi: { isChidra: false },
    },
    fatherPromise: {
      band: "Moderate",
      sphuta: { kind: "beeja", rasi: "Aries", navamsa: "Scorpio", strength: "moderate" },
      putraTithi: { isChidra: true },
    },
    coupleConvergence: "Moderate convergence",
    spouseName: "Test Spouse",
    childSequence: {
      methodA: {
        slots: [
          {
            index: 1,
            sign: "Leo",
            obstructionScore: 1,
            sex: { tendency: "male", confidence: "moderate" },
          },
          {
            index: 2,
            sign: "Libra",
            obstructionScore: 2,
            sex: { tendency: "female", confidence: "low" },
          },
        ],
      },
    },
    childrenCard: null,
    ...overrides,
  };
}

describe("buildProgenyView", () => {
  it("reads both promise bands and their sphuta kind/strength", () => {
    const view = buildProgenyView(scores());
    expect(view.motherPromise?.band).toBe("Strong");
    expect(view.motherPromise?.sphuta?.kind).toBe("kshetra");
    expect(view.fatherPromise?.band).toBe("Moderate");
    expect(view.fatherPromise?.sphuta?.kind).toBe("beeja");
    expect(view.fatherPromise?.isChidraTithi).toBe(true);
    expect(view.motherPromise?.isChidraTithi).toBe(false);
  });

  it("returns null for a promise with no band, rather than a half-filled object", () => {
    const view = buildProgenyView(scores({ motherPromise: null }));
    expect(view.motherPromise).toBeNull();
  });

  it("only accepts a coupleConvergence value from the documented 4-band set", () => {
    expect(buildProgenyView(scores()).coupleConvergence).toBe("Moderate convergence");
    expect(buildProgenyView(scores({ coupleConvergence: "Great!" })).coupleConvergence).toBeNull();
  });

  it("flattens methodA's slots into the per-child sequence, defaulting an unreadable tendency to inconclusive", () => {
    const view = buildProgenyView(scores());
    expect(view.childSequence).toHaveLength(2);
    expect(view.childSequence[0]).toEqual({
      index: 1,
      sign: "Leo",
      tendency: "male",
      confidence: "moderate",
      obstructionScore: 1,
    });
    const garbled = buildProgenyView(
      scores({
        childSequence: {
          methodA: { slots: [{ index: 1, sign: "Leo", sex: { tendency: "not-a-real-value" } }] },
        },
      }),
    );
    expect(garbled.childSequence[0]?.tendency).toBe("inconclusive");
    expect(garbled.childSequence[0]?.confidence).toBe("low");
  });

  it("reads the 35+ children card only when the backend actually populated it", () => {
    expect(buildProgenyView(scores()).childrenCard).toBeNull();
    const withCard = buildProgenyView(
      scores({
        childrenCard: {
          likelyCount: 2,
          sequence: [{ index: 1, tendency: "male", confidence: "moderate", obstructionScore: 0 }],
        },
      }),
    );
    expect(withCard.childrenCard).toEqual({
      likelyCount: 2,
      sequence: [{ index: 1, tendency: "male", confidence: "moderate", obstructionScore: 0 }],
    });
  });

  it("carries the spouse name through untouched", () => {
    expect(buildProgenyView(scores()).spouseName).toBe("Test Spouse");
    expect(buildProgenyView(scores({ spouseName: undefined })).spouseName).toBeNull();
  });
});

describe("SECTION_ICON", () => {
  it("has an entry for all 9 of the backend's progeny section ids", () => {
    expect(Object.keys(SECTION_ICON).sort()).toEqual(
      [
        "progeny_promise",
        "saptamsa_reading",
        "reproductive_capacity",
        "couple_synthesis",
        "child_sequence",
        "progeny_timing",
        "obstructions",
        "progeny_remedies",
        "progeny_outlook",
      ].sort(),
    );
  });
});
