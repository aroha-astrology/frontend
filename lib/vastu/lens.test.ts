import { describe, expect, it } from "vitest";
import { lensSectors, toScreenBearing, zoneFit } from "./lens";
import type { Plan } from "./types";

const plan = (northOffsetDeg = 0): Plan => ({
  plot: [
    { x: 0, y: 0 },
    { x: 12, y: 0 },
    { x: 12, y: 12 },
    { x: 0, y: 12 },
  ],
  northOffsetDeg,
  rooms: [],
});

describe("Vastu Lens", () => {
  it("rates each direction for a room type", () => {
    expect(zoneFit("kitchen", "SE")).toBe("ideal");
    expect(zoneFit("kitchen", "NW")).toBe("acceptable");
    expect(zoneFit("kitchen", "NE")).toBe("avoid");
    expect(zoneFit("kitchen", "S")).toBe("neutral");
    expect(zoneFit("unknown", "N")).toBe("neutral");
  });

  it("places sectors by real bearing, turned by the north offset", () => {
    expect(toScreenBearing(0, 0)).toBe(0);
    expect(toScreenBearing(0, 90)).toBe(270); // real north now points screen-left
    const north = lensSectors(plan(0), 10).find((s) => s.dir === "N")!;
    expect(north.labelAt.y).toBeLessThan(6);
    const turned = lensSectors(plan(90), 10).find((s) => s.dir === "N")!;
    expect(turned.labelAt.x).toBeLessThan(6);
  });

  it("colours sectors only when a room type is given", () => {
    expect(lensSectors(plan(), 10).every((s) => s.fit === null)).toBe(true);
    expect(lensSectors(plan(), 10, "kitchen").find((s) => s.dir === "SE")?.fit).toBe("ideal");
  });
});
