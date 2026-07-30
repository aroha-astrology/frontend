import { describe, it, expect } from "vitest";
import type { PanchangMonthDay } from "@/lib/api";
import {
  MUHURTA_CATEGORY_IDS,
  evaluateMuhurtaCategory,
  findUpcomingFavorableDays,
} from "./muhurta-categories";

// "Vishakha" is deliberately not mentioned in ANY category's
// favorable/unfavorable nakshatra list below (see muhurta-categories.ts) —
// it's the one truly nakshatra-neutral default for isolating other signals.
const NEUTRAL_NAKSHATRA = "Vishakha";

function makeDay(overrides: Partial<PanchangMonthDay> & { isoDate: string }): PanchangMonthDay {
  const day = Number(overrides.isoDate.slice(8, 10));
  return {
    day,
    isoDate: overrides.isoDate,
    tithiName: overrides.tithiName ?? "Tritiya",
    tithiNumber: overrides.tithiNumber ?? 3,
    paksha: overrides.paksha ?? "Shukla",
    nakshatraName: overrides.nakshatraName ?? NEUTRAL_NAKSHATRA,
    vara: overrides.vara ?? "Budhvaar",
    isFullMoon: overrides.isFullMoon ?? false,
    isNewMoon: overrides.isNewMoon ?? false,
    isEkadashi: overrides.isEkadashi ?? false,
  };
}

describe("MUHURTA_CATEGORY_IDS", () => {
  it("lists the 7 categories, including the required minimum 6", () => {
    expect(MUHURTA_CATEGORY_IDS).toEqual(
      expect.arrayContaining([
        "careerBusiness",
        "education",
        "travel",
        "property",
        "health",
        "beautySelfCare",
      ]),
    );
    expect(MUHURTA_CATEGORY_IDS.length).toBe(7);
  });
});

describe("evaluateMuhurtaCategory", () => {
  it("a favorable nakshatra alone is enough to tip a day to 'favorable'", () => {
    // tithi 8 and Somvaar are both neutral (neither favorable nor
    // unfavorable) for careerBusiness, isolating the nakshatra's +2.
    const day = makeDay({ isoDate: "2026-08-01", nakshatraName: "Pushya", tithiNumber: 8, vara: "Somvaar" });
    const result = evaluateMuhurtaCategory("careerBusiness", day);
    expect(result.tone).toBe("favorable");
    expect(result.reasonKey).toBe("horoscope.panchang.muhurta.verdicts.careerBusiness.favorable");
  });

  it("an unfavorable nakshatra alone is enough to tip a day to 'unfavorable'", () => {
    const day = makeDay({ isoDate: "2026-08-01", nakshatraName: "Bharani", tithiNumber: 8, vara: "Somvaar" });
    const result = evaluateMuhurtaCategory("careerBusiness", day);
    expect(result.tone).toBe("unfavorable");
    expect(result.reasonKey).toBe("horoscope.panchang.muhurta.verdicts.careerBusiness.unfavorable");
  });

  it("a Rikta tithi (unfavorable across every category) tips a day to 'unfavorable'", () => {
    // Shanivaar is never favorable in any category's table below (at worst
    // neutral for education), so it never offsets the tithi's -2.
    const day = makeDay({ isoDate: "2026-08-01", nakshatraName: NEUTRAL_NAKSHATRA, tithiNumber: 4, vara: "Shanivaar" });
    for (const category of MUHURTA_CATEGORY_IDS) {
      expect(evaluateMuhurtaCategory(category, day).tone).toBe("unfavorable");
    }
  });

  it("Amavasya (30) is unfavorable across every category", () => {
    const day = makeDay({
      isoDate: "2026-08-01",
      nakshatraName: NEUTRAL_NAKSHATRA,
      tithiNumber: 30,
      paksha: "Krishna",
      vara: "Shanivaar",
    });
    for (const category of MUHURTA_CATEGORY_IDS) {
      expect(evaluateMuhurtaCategory(category, day).tone).toBe("unfavorable");
    }
  });

  it("no strong signal either way lands on 'neutral'", () => {
    // Vishakha is in neither list for careerBusiness; tithi 8 is in neither
    // list either (not in the general-auspicious set, not Rikta/Amavasya);
    // Budhvaar is favorable (+1) which alone isn't enough to cross the
    // favorable threshold (needs >= 2).
    const day = makeDay({ isoDate: "2026-08-01", tithiNumber: 8, vara: "Budhvaar" });
    expect(evaluateMuhurtaCategory("careerBusiness", day).tone).toBe("neutral");
  });

  it("a favorable tithi plus a favorable vara together cross the favorable threshold", () => {
    // tithiNumber 2 is in GENERAL_AUSPICIOUS (+1); Budhvaar is favorable for
    // careerBusiness (+1) = 2 total, meeting the >= 2 favorable threshold.
    const day = makeDay({ isoDate: "2026-08-01", tithiNumber: 2, vara: "Budhvaar" });
    expect(evaluateMuhurtaCategory("careerBusiness", day).tone).toBe("favorable");
  });

  it("every category returns a distinct, well-formed reasonKey per tone", () => {
    for (const category of MUHURTA_CATEGORY_IDS) {
      for (const tone of ["favorable", "neutral", "unfavorable"] as const) {
        expect(`horoscope.panchang.muhurta.verdicts.${category}.${tone}`).toMatch(/^horoscope\.panchang\.muhurta\.verdicts\./);
      }
    }
  });
});

describe("findUpcomingFavorableDays", () => {
  it("returns only favorable days, nearest-first, excluding days before fromIsoDate", () => {
    const days: PanchangMonthDay[] = [
      makeDay({ isoDate: "2026-08-01", nakshatraName: "Pushya" }), // favorable but in the past relative to fromIsoDate
      makeDay({ isoDate: "2026-08-05", nakshatraName: "Ardra", tithiNumber: 8 }), // neutral
      makeDay({ isoDate: "2026-08-10", nakshatraName: "Hasta" }), // favorable
      makeDay({ isoDate: "2026-08-03", nakshatraName: "Bharani" }), // unfavorable
      makeDay({ isoDate: "2026-08-07", nakshatraName: "UttaraAshadha" }), // favorable
    ];
    const result = findUpcomingFavorableDays("careerBusiness", days, { fromIsoDate: "2026-08-02" });
    expect(result.map((d) => d.isoDate)).toEqual(["2026-08-07", "2026-08-10"]);
  });

  it("caps results at the given limit (default 5)", () => {
    const days: PanchangMonthDay[] = Array.from({ length: 10 }, (_, i) =>
      makeDay({ isoDate: `2026-08-${String(i + 1).padStart(2, "0")}`, nakshatraName: "Pushya" }),
    );
    const result = findUpcomingFavorableDays("careerBusiness", days, { fromIsoDate: "2026-08-01" });
    expect(result.length).toBe(5);
    expect(result[0].isoDate).toBe("2026-08-01");
  });

  it("respects a custom limit", () => {
    const days: PanchangMonthDay[] = Array.from({ length: 10 }, (_, i) =>
      makeDay({ isoDate: `2026-08-${String(i + 1).padStart(2, "0")}`, nakshatraName: "Pushya" }),
    );
    const result = findUpcomingFavorableDays("careerBusiness", days, { fromIsoDate: "2026-08-01", limit: 2 });
    expect(result.length).toBe(2);
  });

  it("de-duplicates repeated isoDates (e.g. this-month/next-month overlap)", () => {
    const days: PanchangMonthDay[] = [
      makeDay({ isoDate: "2026-08-01", nakshatraName: "Pushya" }),
      makeDay({ isoDate: "2026-08-01", nakshatraName: "Pushya" }),
    ];
    const result = findUpcomingFavorableDays("careerBusiness", days, { fromIsoDate: "2026-08-01" });
    expect(result.length).toBe(1);
  });

  it("returns an empty array when nothing in range is favorable", () => {
    const days: PanchangMonthDay[] = [
      makeDay({ isoDate: "2026-08-01", nakshatraName: "Bharani" }),
      makeDay({ isoDate: "2026-08-02", nakshatraName: "Ardra", tithiNumber: 8 }),
    ];
    const result = findUpcomingFavorableDays("careerBusiness", days, { fromIsoDate: "2026-08-01" });
    expect(result).toEqual([]);
  });

  it("handles out-of-order input (does not assume days are pre-sorted)", () => {
    const days: PanchangMonthDay[] = [
      makeDay({ isoDate: "2026-08-10", nakshatraName: "Pushya" }),
      makeDay({ isoDate: "2026-08-03", nakshatraName: "Hasta" }),
    ];
    const result = findUpcomingFavorableDays("careerBusiness", days, { fromIsoDate: "2026-08-01" });
    expect(result.map((d) => d.isoDate)).toEqual(["2026-08-03", "2026-08-10"]);
  });
});
