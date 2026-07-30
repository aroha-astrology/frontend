import { describe, it, expect } from "vitest";
import { getVaraLord, VARA_LORDS } from "./vara-lord";

describe("getVaraLord", () => {
  it("maps all 7 weekday numbers (0=Sunday..6=Saturday) to the correct classical ruling planet", () => {
    expect(getVaraLord(0)).toBe("sun"); // Sunday — Ravivara
    expect(getVaraLord(1)).toBe("moon"); // Monday — Somavara
    expect(getVaraLord(2)).toBe("mars"); // Tuesday — Mangalvara
    expect(getVaraLord(3)).toBe("mercury"); // Wednesday — Budhavara
    expect(getVaraLord(4)).toBe("jupiter"); // Thursday — Guruvara
    expect(getVaraLord(5)).toBe("venus"); // Friday — Shukravara
    expect(getVaraLord(6)).toBe("saturn"); // Saturday — Shanivara
  });

  it("accepts a Date and reads its local weekday", () => {
    // 2026-07-26 is a Sunday.
    expect(getVaraLord(new Date(2026, 6, 26))).toBe("sun");
    // 2026-07-27 is a Monday (today, per project context).
    expect(getVaraLord(new Date(2026, 6, 27))).toBe("moon");
    // 2026-07-30 is a Thursday.
    expect(getVaraLord(new Date(2026, 6, 30))).toBe("jupiter");
  });

  it("throws on an out-of-range day-of-week number", () => {
    expect(() => getVaraLord(7)).toThrow();
    expect(() => getVaraLord(-1)).toThrow();
  });

  it("VARA_LORDS has exactly the 7 weekday keys, each a distinct planet", () => {
    const keys = Object.keys(VARA_LORDS).map(Number).sort((a, b) => a - b);
    expect(keys).toEqual([0, 1, 2, 3, 4, 5, 6]);
    const planets = Object.values(VARA_LORDS);
    expect(new Set(planets).size).toBe(7);
  });
});
