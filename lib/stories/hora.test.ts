import { describe, expect, it } from "vitest";
import type { HoraSlot } from "@/lib/api";
import { horaGuideKeys, pickBestHora } from "./hora";

const slot = (planet: string, startTime: string, endTime: string, isAuspicious: boolean): HoraSlot => ({
  planet,
  startTime,
  endTime,
  isAuspicious,
});

// A Tuesday from a 06:28 sunrise: Mars, Sun, Venus, Mercury, Moon, Saturn, … and the last one runs past midnight.
const DAY: HoraSlot[] = [
  slot("Mars", "06:28", "07:28", false),
  slot("Sun", "07:28", "08:28", false),
  slot("Venus", "08:28", "09:28", true),
  slot("Mercury", "09:28", "10:28", true),
  slot("Moon", "10:28", "11:28", true),
  slot("Saturn", "11:28", "12:28", false),
  slot("Mars", "23:28", "00:28", false),
];

const at = (h: number, m: number) => new Date(2026, 9, 6, h, m);

describe("pickBestHora", () => {
  it("shows the running hora when it is auspicious, with time left and progress", () => {
    const best = pickBestHora(DAY, at(9, 46));
    expect(best?.slot.planet).toBe("Mercury");
    expect(best?.status).toBe("live");
    expect(best?.minutes).toBe(42);
    expect(best?.progress).toBeCloseTo(18 / 60);
  });

  it("looks ahead to the next auspicious hora when the running one is not", () => {
    const best = pickBestHora(DAY, at(7, 0));
    expect(best?.slot.planet).toBe("Venus");
    expect(best?.status).toBe("upcoming");
    expect(best?.minutes).toBe(88);
    expect(best?.progress).toBe(0);
  });

  it("never points back at an auspicious hora that is already over", () => {
    const best = pickBestHora(DAY, at(11, 40));
    expect(best?.slot.planet).toBe("Saturn");
    expect(best?.status).toBe("live");
    expect(best?.minutes).toBe(48);
  });

  it("handles a hora that crosses midnight", () => {
    const best = pickBestHora(DAY, at(0, 10));
    expect(best?.slot.planet).toBe("Mars");
    expect(best?.status).toBe("live");
    expect(best?.minutes).toBe(18);
    expect(best?.progress).toBeCloseTo(42 / 60);
  });

  it("uses a morning clock time correctly (09:05 is not 9:05 PM)", () => {
    const best = pickBestHora(DAY, at(9, 5));
    expect(best?.slot.planet).toBe("Venus");
    expect(best?.minutes).toBe(23);
  });

  it("returns nothing for an empty list", () => {
    expect(pickBestHora([], at(9, 0))).toBeNull();
  });
});

describe("horaGuideKeys", () => {
  it("gives the advice keys for a hora planet, whatever its case", () => {
    expect(horaGuideKeys("Moon")).toEqual({
      about: "stories.hora.planets.moon.about",
      good: ["stories.hora.planets.moon.good1", "stories.hora.planets.moon.good2", "stories.hora.planets.moon.good3"],
      avoid: ["stories.hora.planets.moon.avoid1", "stories.hora.planets.moon.avoid2"],
    });
  });

  it("has nothing for Rahu and Ketu, which rule no hora", () => {
    expect(horaGuideKeys("Rahu")).toBeNull();
    expect(horaGuideKeys("")).toBeNull();
  });
});
