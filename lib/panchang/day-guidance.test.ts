import { describe, it, expect } from "vitest";
import { getDayGuidanceKey } from "./day-guidance";

const GUIDANCE = "horoscope.panchang.guidance";

describe("getDayGuidanceKey", () => {
  describe("the three headline tithis take priority over everything else", () => {
    it("Amavasya (30) wins even with a Pushya nakshatra and a Sunday", () => {
      expect(
        getDayGuidanceKey({ tithiNumber: 30, paksha: "Krishna", vara: "Ravivaar", nakshatraName: "Pushya" }),
      ).toBe(`${GUIDANCE}.amavasyaRest`);
    });

    it("Purnima (15)", () => {
      expect(getDayGuidanceKey({ tithiNumber: 15, paksha: "Shukla" })).toBe(`${GUIDANCE}.purnimaCulmination`);
    });

    it("Ekadashi — Shukla instance (11)", () => {
      expect(getDayGuidanceKey({ tithiNumber: 11, paksha: "Shukla" })).toBe(`${GUIDANCE}.ekadashiDiscipline`);
    });

    it("Ekadashi — Krishna instance (26)", () => {
      expect(getDayGuidanceKey({ tithiNumber: 26, paksha: "Krishna" })).toBe(`${GUIDANCE}.ekadashiDiscipline`);
    });
  });

  describe("nakshatra overrides apply only when no headline tithi matched", () => {
    it("Pushya nakshatra on an ordinary tithi", () => {
      expect(getDayGuidanceKey({ tithiNumber: 3, paksha: "Shukla", nakshatraName: "Pushya" })).toBe(
        `${GUIDANCE}.pushyaAuspicious`,
      );
    });

    it("a cautious nakshatra (Ashlesha) on an ordinary tithi", () => {
      expect(getDayGuidanceKey({ tithiNumber: 3, paksha: "Shukla", nakshatraName: "Ashlesha" })).toBe(
        `${GUIDANCE}.cautiousNakshatra`,
      );
    });

    it("Jyeshtha is also a cautious nakshatra", () => {
      expect(getDayGuidanceKey({ tithiNumber: 6, paksha: "Shukla", nakshatraName: "Jyeshtha" })).toBe(
        `${GUIDANCE}.cautiousNakshatra`,
      );
    });

    it("Moola is also a cautious nakshatra", () => {
      expect(getDayGuidanceKey({ tithiNumber: 7, paksha: "Shukla", nakshatraName: "Moola" })).toBe(
        `${GUIDANCE}.cautiousNakshatra`,
      );
    });

    it("an unrelated nakshatra (Hasta) does not trigger either override", () => {
      expect(getDayGuidanceKey({ tithiNumber: 3, paksha: "Shukla", nakshatraName: "Hasta" })).toBe(
        `${GUIDANCE}.tritiyaCelebration`,
      );
    });
  });

  describe("vara overrides apply only when no headline tithi/nakshatra matched", () => {
    it("Ravivaar (Sunday) on an ordinary tithi with no special nakshatra", () => {
      expect(getDayGuidanceKey({ tithiNumber: 3, paksha: "Shukla", vara: "Ravivaar" })).toBe(
        `${GUIDANCE}.ravivaarVitality`,
      );
    });

    it("Somvaar (Monday) on an ordinary tithi with no special nakshatra", () => {
      expect(getDayGuidanceKey({ tithiNumber: 3, paksha: "Shukla", vara: "Somvaar" })).toBe(
        `${GUIDANCE}.somvaarEmotionalCare`,
      );
    });

    it("nakshatra override still wins over vara override", () => {
      expect(
        getDayGuidanceKey({ tithiNumber: 3, paksha: "Shukla", vara: "Ravivaar", nakshatraName: "Pushya" }),
      ).toBe(`${GUIDANCE}.pushyaAuspicious`);
    });

    it("an unrelated vara (Mangalvaar) falls through to the tithi bucket", () => {
      expect(getDayGuidanceKey({ tithiNumber: 3, paksha: "Shukla", vara: "Mangalvaar" })).toBe(
        `${GUIDANCE}.tritiyaCelebration`,
      );
    });
  });

  describe("the 24 ordinary tithis map to their expected bucket, both pakshas", () => {
    const cases: Array<[number, string]> = [
      [1, "pratipadaFreshStart"],
      [16, "pratipadaFreshStart"],
      [2, "dwitiyaPartnership"],
      [17, "dwitiyaPartnership"],
      [3, "tritiyaCelebration"],
      [18, "tritiyaCelebration"],
      [4, "chaturthiObstacles"],
      [19, "chaturthiObstacles"],
      [5, "panchamiLearning"],
      [20, "panchamiLearning"],
      [6, "shashthiCourage"],
      [21, "shashthiCourage"],
      [7, "saptamiLeadership"],
      [22, "saptamiLeadership"],
      [8, "ashtamiInnerStrength"],
      [23, "ashtamiInnerStrength"],
      [9, "navamiBoldAction"],
      [24, "navamiBoldAction"],
      [10, "dashamiResolve"],
      [25, "dashamiResolve"],
      [12, "dwadashiCharity"],
      [27, "dwadashiCharity"],
      [14, "chaturdashiInnerWork"],
      [29, "chaturdashiInnerWork"],
    ];

    for (const [tithiNumber, expected] of cases) {
      it(`tithiNumber ${tithiNumber} -> ${expected}`, () => {
        const paksha = tithiNumber <= 15 ? "Shukla" : "Krishna";
        expect(getDayGuidanceKey({ tithiNumber, paksha })).toBe(`${GUIDANCE}.${expected}`);
      });
    }

    it("Trayodashi is split by paksha: Shukla (13) -> reflectiveWriting", () => {
      expect(getDayGuidanceKey({ tithiNumber: 13, paksha: "Shukla" })).toBe(`${GUIDANCE}.reflectiveWriting`);
    });

    it("Trayodashi is split by paksha: Krishna (28) -> pradoshLettingGo", () => {
      expect(getDayGuidanceKey({ tithiNumber: 28, paksha: "Krishna" })).toBe(`${GUIDANCE}.pradoshLettingGo`);
    });
  });

  describe("paksha-relative (1-15) input with an explicit krishna paksha is normalized", () => {
    it("relative Trayodashi (13) + paksha:'krishna' normalizes to absolute 28 (Pradosh)", () => {
      expect(getDayGuidanceKey({ tithiNumber: 13, paksha: "krishna" })).toBe(`${GUIDANCE}.pradoshLettingGo`);
    });

    it("relative Ekadashi (11) + paksha:'Krishna' (capitalized) normalizes to absolute 26", () => {
      expect(getDayGuidanceKey({ tithiNumber: 11, paksha: "Krishna" })).toBe(`${GUIDANCE}.ekadashiDiscipline`);
    });

    it("tithiNumber 15 is never renormalized (it's already Purnima, not paksha-relative)", () => {
      expect(getDayGuidanceKey({ tithiNumber: 15, paksha: "krishna" })).toBe(`${GUIDANCE}.purnimaCulmination`);
    });
  });

  describe("defensive fallback for out-of-range tithiNumber", () => {
    it("falls back to shuklaPakshaGeneral for an invalid number with paksha Shukla", () => {
      expect(getDayGuidanceKey({ tithiNumber: 0, paksha: "Shukla" })).toBe(`${GUIDANCE}.shuklaPakshaGeneral`);
    });

    it("falls back to krishnaPakshaGeneral for an invalid number with paksha Krishna", () => {
      expect(getDayGuidanceKey({ tithiNumber: 99, paksha: "Krishna" })).toBe(`${GUIDANCE}.krishnaPakshaGeneral`);
    });

    it("falls back to the ultimate generalDayGuidance key when paksha itself is unrecognized", () => {
      expect(getDayGuidanceKey({ tithiNumber: 0, paksha: "" })).toBe(`${GUIDANCE}.generalDayGuidance`);
    });
  });
});
