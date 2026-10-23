import { describe, expect, it } from "vitest";
import { ascendantLongitude, polar, signIndexOf, wheelAngle, wheelPlanets } from "./wheel";
import { signShift } from "./sign-shift";

describe("ascendantLongitude", () => {
  it("reads a longitude, or builds one from the sign and degree", () => {
    expect(ascendantLongitude({ longitude: 372 })).toBe(12);
    expect(ascendantLongitude({ ascendantSign: "Leo", degrees: 10 })).toBe(130);
    expect(ascendantLongitude({ sign: "aries" })).toBe(0);
    expect(ascendantLongitude(null)).toBeNull();
    expect(ascendantLongitude({ sign: "Nonsense" })).toBeNull();
  });
});

describe("wheelAngle", () => {
  it("puts the ascendant at the left and the signs counter-clockwise", () => {
    expect(wheelAngle(130, 130)).toBe(180);
    // 30 degrees later in the zodiac sits 30 degrees further round counter-clockwise from the ascendant's left side... i.e. lower on the left going down
    expect(wheelAngle(160, 130)).toBe(150);
    expect(wheelAngle(100, 130)).toBe(210);
  });

  it("wraps past 360 and below 0", () => {
    expect(wheelAngle(10, 350)).toBe(160);
    expect(wheelAngle(350, 10)).toBe(200);
  });
});

describe("wheelPlanets", () => {
  const planets = [
    { planet: "Sun", longitude: 130 },
    { planet: "Mercury", longitude: 131 },
    { planet: "Venus", longitude: 133 },
    { planet: "Moon", longitude: 250, isRetrograde: false },
    { planet: "Rahu", longitude: 20, retrograde: true },
    { planet: "Broken" },
  ];

  it("drops planets without a longitude and keeps every other one", () => {
    expect(wheelPlanets(planets, 130).map((p) => p.planet).sort()).toEqual(["Mercury", "Moon", "Rahu", "Sun", "Venus"]);
  });

  it("spreads a cluster apart without moving the true angle", () => {
    const out = wheelPlanets(planets, 130);
    const cluster = out.filter((p) => ["Sun", "Mercury", "Venus"].includes(p.planet)).sort((a, b) => a.angle - b.angle);
    expect(cluster[1]!.angle - cluster[0]!.angle).toBeGreaterThanOrEqual(12);
    expect(cluster[2]!.angle - cluster[1]!.angle).toBeGreaterThanOrEqual(12);
    const venus = out.find((p) => p.planet === "Venus")!;
    expect(venus.trueAngle).toBe(wheelAngle(133, 130));
  });

  it("carries the retrograde flag", () => {
    expect(wheelPlanets(planets, 130).find((p) => p.planet === "Rahu")!.retrograde).toBe(true);
  });
});

describe("polar", () => {
  it("turns an angle and radius into screen coordinates (y grows downwards)", () => {
    const left = polar(100, 100, 50, 180);
    expect(left.x).toBeCloseTo(50);
    expect(left.y).toBeCloseTo(100);
    const top = polar(100, 100, 50, 90);
    expect(top.x).toBeCloseTo(100);
    expect(top.y).toBeCloseTo(50);
  });
});

describe("signIndexOf", () => {
  it("is case-insensitive and -1 for anything else", () => {
    expect(signIndexOf("Pisces")).toBe(11);
    expect(signIndexOf("pisces")).toBe(11);
    expect(signIndexOf(null)).toBe(-1);
  });
});

describe("signShift", () => {
  const ayanamsa = 24.2;

  it("a Sun well into its sidereal sign is in the next sign in the Western system", () => {
    // Sidereal Aquarius 10 degrees (310) + 24.2 = tropical 334.2 = Pisces
    const shift = signShift([{ planet: "Sun", longitude: 310 }, { planet: "Moon", longitude: 10 }], ayanamsa)!;
    expect(shift.sun).toEqual({ western: "Pisces", vedic: "Aquarius", changed: true });
  });

  it("a Sun in the first degrees of its sign keeps the same sign, and the card must say so", () => {
    // sidereal Leo 2 degrees (122) + 24.2 = 146.2 = Leo
    const shift = signShift([{ planet: "Sun", longitude: 122 }, { planet: "Moon", longitude: 10 }], ayanamsa)!;
    expect(shift.sun.changed).toBe(false);
    expect(shift.sun.western).toBe("Leo");
  });

  it("works for the Moon as well, and wraps past 360", () => {
    const shift = signShift([{ planet: "Sun", longitude: 10 }, { planet: "Moon", longitude: 340 }], ayanamsa)!;
    expect(shift.moon).toEqual({ western: "Aries", vedic: "Pisces", changed: true });
  });

  it("is null when anything needed is missing", () => {
    expect(signShift(null, ayanamsa)).toBeNull();
    expect(signShift([{ planet: "Sun", longitude: 1 }], ayanamsa)).toBeNull();
    expect(signShift([{ planet: "Sun", longitude: 1 }, { planet: "Moon", longitude: 2 }], null)).toBeNull();
  });
});
