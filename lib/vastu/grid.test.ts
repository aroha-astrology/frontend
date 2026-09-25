import { describe, expect, it } from "vitest";
import { ZONES16, sixteenSectors, padaGrid, cellAt, rayToEdge } from "./grid";
import { planCenter } from "./geometry";
import { pointInPolygon } from "./geometry";
import type { Plan, Pt } from "./types";

const square = (northOffsetDeg = 0): Plan => ({
  plot: [
    { x: 0, y: 0 },
    { x: 12, y: 0 },
    { x: 12, y: 12 },
    { x: 0, y: 12 },
  ],
  northOffsetDeg,
  rooms: [],
});

const lShape = (northOffsetDeg = 0): Plan => ({
  plot: [
    { x: 0, y: 0 },
    { x: 14, y: 0 },
    { x: 14, y: 6 },
    { x: 8, y: 6 },
    { x: 8, y: 10 },
    { x: 0, y: 10 },
  ],
  northOffsetDeg,
  rooms: [],
});

const centroidOf = (poly: Pt[]): Pt => ({
  x: poly.reduce((s, p) => s + p.x, 0) / poly.length,
  y: poly.reduce((s, p) => s + p.y, 0) / poly.length,
});

describe("16 zones", () => {
  it("lists the 16 directions clockwise from N in 22.5° steps", () => {
    expect(ZONES16.map((z) => z.zone)).toEqual(["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]);
    ZONES16.forEach((z, i) => expect(z.bearing).toBeCloseTo(i * 22.5));
  });

  it("builds 16 sectors in the same order", () => {
    const s = sixteenSectors(square(), 10);
    expect(s).toHaveLength(16);
    expect(s.map((x) => x.zone)).toEqual(ZONES16.map((z) => z.zone));
    s.forEach((x) => expect(x.path.startsWith("M")).toBe(true));
  });

  it("puts the N label screen-up at offset 0 and screen-left at offset 90", () => {
    const n0 = sixteenSectors(square(0), 10).find((s) => s.zone === "N")!;
    expect(n0.labelAt.x).toBeCloseTo(6);
    expect(n0.labelAt.y).toBeLessThan(6);
    // just inside the plot edge
    expect(n0.labelAt.y).toBeGreaterThan(0);
    expect(n0.labelAt.y).toBeLessThan(1.5);

    const n90 = sixteenSectors(square(90), 10).find((s) => s.zone === "N")!;
    expect(n90.labelAt.x).toBeLessThan(6);
    expect(n90.labelAt.y).toBeCloseTo(6);
    const e90 = sixteenSectors(square(90), 10).find((s) => s.zone === "E")!;
    expect(e90.labelAt.y).toBeLessThan(6); // real east now points screen-up
  });

  it("keeps labels inside a concave plot", () => {
    const plan = lShape();
    for (const s of sixteenSectors(plan, 12)) expect(pointInPolygon(s.labelAt, plan.plot)).toBe(true);
  });

  it("measures the ray to the plot edge", () => {
    expect(rayToEdge(square().plot, { x: 6, y: 6 }, 0)).toBeCloseTo(6);
    expect(rayToEdge(square().plot, { x: 6, y: 6 }, 90)).toBeCloseTo(6);
  });
});

describe("Vastu Purusha Mandala (pada grid)", () => {
  it("has n*n cells and n+1 lines each way", () => {
    const g = padaGrid(square());
    expect(g.cells).toHaveLength(81);
    expect(g.lines).toHaveLength(20);
    expect(padaGrid(square(), 8).cells).toHaveLength(64);
  });

  it("assigns rings from the centre outwards", () => {
    const g = padaGrid(square());
    expect(g.cells.filter((c) => c.ring === 0)).toHaveLength(1);
    expect(g.cells.filter((c) => c.ring === 1)).toHaveLength(8);
    expect(g.cells.filter((c) => c.ring === 4)).toHaveLength(32);
    expect(g.cells.find((c) => c.ring === 0)).toMatchObject({ row: 4, col: 4 });
  });

  it("puts the plan centre in the centre cell", () => {
    for (const plan of [square(), lShape(), lShape(37)]) {
      const c = planCenter(plan);
      expect(cellAt(plan, c)).toEqual({ row: 4, col: 4 });
      const centre = padaGrid(plan).cells.find((x) => x.ring === 0)!;
      expect(pointInPolygon(c, centre.polygon)).toBe(true);
    }
  });

  it("covers the plot bounding box", () => {
    for (const plan of [square(), lShape(), lShape(30)]) {
      for (const p of plan.plot) expect(cellAt(plan, p)).not.toBeNull();
    }
    expect(cellAt(square(), { x: 40, y: 40 })).toBeNull();
  });

  it("makes the Brahmasthan the middle 3×3 block, containing the centre", () => {
    const plan = square();
    const g = padaGrid(plan);
    // square plot 12 → side 12/9; middle block spans 4..8
    const xs = g.brahmasthan.map((p) => p.x);
    const ys = g.brahmasthan.map((p) => p.y);
    expect(Math.min(...xs)).toBeCloseTo(4);
    expect(Math.max(...xs)).toBeCloseTo(8);
    expect(Math.min(...ys)).toBeCloseTo(4);
    expect(Math.max(...ys)).toBeCloseTo(8);
    expect(pointInPolygon(planCenter(plan), g.brahmasthan)).toBe(true);
    // Every ring-0/1 cell centre sits inside it; ring-2 cells don't.
    for (const cell of g.cells) {
      const inside = pointInPolygon(centroidOf(cell.polygon), g.brahmasthan);
      expect(inside).toBe(cell.ring <= 1);
    }
  });

  it("aligns row 0 with real north", () => {
    const top0 = centroidOf(padaGrid(square(0)).cells.find((c) => c.row === 0 && c.col === 4)!.polygon);
    expect(top0.y).toBeLessThan(2);
    const top90 = centroidOf(padaGrid(square(90)).cells.find((c) => c.row === 0 && c.col === 4)!.polygon);
    expect(top90.x).toBeLessThan(2); // real north is screen-left
    expect(top90.y).toBeCloseTo(6);
  });

  it("keeps the centre fixed when rotated by 90°", () => {
    const plan = lShape(0);
    const turned = lShape(90);
    const c0 = centroidOf(padaGrid(plan).brahmasthan);
    const c90 = centroidOf(padaGrid(turned).brahmasthan);
    expect(c90.x).toBeCloseTo(c0.x);
    expect(c90.y).toBeCloseTo(c0.y);
    expect(c0.x).toBeCloseTo(planCenter(plan).x);
    expect(c0.y).toBeCloseTo(planCenter(plan).y);
    const centre90 = centroidOf(padaGrid(turned).cells.find((c) => c.ring === 0)!.polygon);
    expect(centre90.x).toBeCloseTo(c0.x);
    expect(centre90.y).toBeCloseTo(c0.y);
  });
});
