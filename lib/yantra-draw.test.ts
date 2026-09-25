import { describe, expect, it } from "vitest";
import { mantraInScript, wallpaperSvg, yantraSvg } from "./yantra-draw";
import type { YantraSpec } from "./yantra-api";

const SPEC: YantraSpec = {
  planet: "Jupiter",
  grid: [
    [10, 5, 12],
    [11, 9, 7],
    [6, 13, 8],
  ],
  magicSum: 27,
  mantra: { devanagari: "ॐ ग्रां ग्रीं ग्रौं सः गुरवे नमः", iast: "oṃ grāṃ grīṃ grauṃ saḥ gurave namaḥ" },
  colours: { primary: "#F4C430", accent: "#FFE8A3", background: "#2A2106" },
  nakshatra: "Pushya",
  affirmationKey: "yantra.affirmation.jupiter",
  why: [],
};

describe("yantra drawing", () => {
  it("draws every number of the square and the four-gated enclosure", () => {
    const svg = yantraSvg(SPEC, 1000);
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000"')).toBe(true);
    for (const n of SPEC.grid.flat()) expect(svg).toContain(`>${n}</text>`);
    expect(svg.match(/<ellipse /g)).toHaveLength(8);
    expect(svg).toContain(SPEC.colours.background);
  });

  it("puts the mantra, affirmation and nakshatra on the wallpaper, escaped", () => {
    const svg = wallpaperSvg(SPEC, {
      title: "Guru Yantra",
      mantra: SPEC.mantra.devanagari,
      mantraIast: SPEC.mantra.iast,
      nakshatra: "Pushya",
      affirmation: "I grow in wisdom & share it",
    });
    expect(svg).toContain('width="1080" height="2340"');
    expect(svg).toContain("ॐ ग्रां");
    expect(svg).toContain("I grow in wisdom &amp; share it");
  });
});

describe("mantraInScript", () => {
  it("keeps Devanagari for Hindi, Marathi, Tamil and English", () => {
    for (const lang of ["hi", "mr", "ta", "en"]) expect(mantraInScript("ॐ गुरवे नमः", lang)).toBe("ॐ गुरवे नमः");
  });

  it("moves the letters into Bengali, Gujarati and Telugu, keeping ॐ", () => {
    expect(mantraInScript("ॐ गुरवे नमः", "gu")).toBe("ॐ ગુરવે નમઃ");
    expect(mantraInScript("ॐ गुरवे नमः", "te")).toBe("ॐ గురవే నమః");
    // Bengali writes va with ব.
    expect(mantraInScript("ॐ गुरवे नमः", "bn")).toBe("ॐ গুরবে নমঃ");
  });
});
