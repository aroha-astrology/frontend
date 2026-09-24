import { describe, expect, it } from "vitest";
import { effectKey, formatUntil, weekdayName, whyFactorText } from "./why-format";

/** A fake t() that shows exactly which keys and values it was asked for. */
const t = (key: string, vars?: Record<string, unknown>) =>
  vars ? `${key}(${Object.entries(vars).map(([k, v]) => `${k}=${String(v)}`).join(",")})` : key;

describe("whyFactorText", () => {
  it("translates planet, house and sign names instead of passing the raw English through", () => {
    const text = whyFactorText(
      t,
      { kind: "transit", effect: -1, textKey: "why.transit", params: { planet: "Saturn", house: 10, sign: "Pisces" } },
      "en",
    );
    expect(text).toBe(
      "why.transit(planet=planetNames.saturn,houseName=why.houses.10,sign=zodiac.signs.pisces)",
    );
  });

  it("fills the placed house and the tara name", () => {
    expect(
      whyFactorText(t, { kind: "lordship", effect: 1, textKey: "why.lordship", params: { planet: "Mars", house: 10, placed: 1 } }, "en"),
    ).toContain("placedName=why.houses.1");
    expect(whyFactorText(t, { kind: "nakshatra", effect: 0, textKey: "why.tara", params: { tara: 4 } }, "en")).toBe(
      "why.tara(taraName=why.taras.4)",
    );
  });

  it("names the nakshatra and the weekday for Decision / Find My Date factors", () => {
    expect(
      whyFactorText(t, { kind: "panchang", effect: 1, textKey: "decide.why.nakshatraGood", params: { nakshatra: "PurvaPhalguni" } }, "en"),
    ).toBe("decide.why.nakshatraGood(nakshatraName=nakshatraNames.purvaphalguni)");
    expect(
      whyFactorText(t, { kind: "panchang", effect: 1, textKey: "decide.why.weekdayGood", params: { weekday: 4 } }, "en"),
    ).toBe("decide.why.weekdayGood(weekdayName=Thursday)");
    expect(weekdayName(0, "hi")).toBe("रविवार");
  });
});

describe("formatUntil", () => {
  it("shows month and year, and survives a bad date", () => {
    expect(formatUntil("2037-01-01", "en")).toBe("Jan 2037");
    expect(formatUntil("not-a-date", "en")).toBe("not-a-date");
  });
});

describe("effectKey", () => {
  it("maps direction to a label", () => {
    expect([effectKey(1), effectKey(0), effectKey(-1)]).toEqual(["why.supports", "why.context", "why.strains"]);
  });
});
