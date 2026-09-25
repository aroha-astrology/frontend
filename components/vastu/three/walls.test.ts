import { describe, expect, it } from "vitest";
import { wallPieces, SILL } from "./walls";

describe("wallPieces", () => {
  it("a plain wall is one solid piece", () => {
    expect(wallPieces(4, 1, [])).toEqual([{ from: 0, to: 4, y0: 0, y1: 1, kind: "solid" }]);
  });

  it("a door leaves a full-height gap", () => {
    const p = wallPieces(4, 1, [{ at: 2, width: 1, kind: "door" }]);
    expect(p).toEqual([
      { from: 0, to: 1.5, y0: 0, y1: 1, kind: "solid" },
      { from: 2.5, to: 4, y0: 0, y1: 1, kind: "solid" },
    ]);
  });

  it("a window leaves a sill and glass", () => {
    const p = wallPieces(4, 1, [{ at: 1, width: 1, kind: "window" }]);
    expect(p.map((x) => x.kind)).toEqual(["solid", "solid", "glass", "solid"]);
    expect(p[1]).toMatchObject({ from: 0.5, to: 1.5, y1: SILL });
    expect(p[2]).toMatchObject({ y0: SILL, y1: 1 });
  });

  it("openings at the ends and overlaps are clamped, not duplicated", () => {
    const p = wallPieces(3, 1, [
      { at: 0, width: 1, kind: "door" },
      { at: 0.3, width: 1, kind: "door" },
    ]);
    expect(p).toEqual([{ from: 0.8, to: 3, y0: 0, y1: 1, kind: "solid" }]);
  });
});
