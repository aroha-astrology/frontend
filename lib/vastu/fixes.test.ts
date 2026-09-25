import { describe, expect, it } from "vitest";
import { applyChange, planFixes, suggestFixes } from "./fixes";
import { analyzePlan } from "./analysis";
import { validatePlan } from "./validation";
import type { Plan, Room } from "./types";

const square = [
  { x: 0, y: 0 },
  { x: 12, y: 0 },
  { x: 12, y: 12 },
  { x: 0, y: 12 },
];
const room = (id: string, type: string, x: number, y: number, w = 3, h = 3, fixtures: Room["fixtures"] = []): Room => ({ id, type, x, y, w, h, fixtures });
const plan = (rooms: Room[]): Plan => ({ plot: square, northOffsetDeg: 0, rooms });

describe("suggestFixes", () => {
  it("moves a north-east bathroom to its best free zone and raises the score", () => {
    const p = plan([room("b", "bathroom", 9, 0), room("k", "kitchen", 9, 9)]);
    const [best, alt] = suggestFixes(p, "b");
    expect(best.toZone).toBe("NW");
    expect(best.toRating).toBe("ideal");
    expect(best.scoreAfter).toBeGreaterThan(best.scoreBefore);
    expect(alt.toZone).not.toBe(best.toZone);
    const next = applyChange(p, best.change);
    expect(validatePlan(next).overlapCount).toBe(0);
    expect(validatePlan(next).outsideCount).toBe(0);
  });

  it("never proposes a spot occupied by another room", () => {
    // NW is taken by a master bedroom, so NW for the bathroom must be elsewhere or skipped.
    const p = plan([room("m", "master_bed", 0, 0, 6, 6), room("b", "bathroom", 9, 0)]);
    for (const s of suggestFixes(p, "b", 5)) {
      expect(validatePlan(applyChange(p, s.change)).overlapCount).toBe(0);
    }
  });

  it("an ideal room gets no suggestion", () => {
    expect(suggestFixes(plan([room("k", "kitchen", 9, 9)]), "k")).toEqual([]);
  });

  it("an entrance is fixed by turning its door", () => {
    const p = plan([room("e", "entrance", 4, 9, 3, 3, [{ id: "d", kind: "door", wall: "bottom", t: 0.5 }])]);
    const [s] = suggestFixes(p, "e");
    expect(s.change.kind).toBe("door");
    expect(["N", "NE", "E"]).toContain(s.toZone);
  });
});

describe("planFixes", () => {
  it("improves the whole plan step by step without collisions", () => {
    const p = plan([
      room("b", "bathroom", 9, 0),
      room("k", "kitchen", 0, 0),
      room("m", "master_bed", 9, 9),
    ]);
    const r = planFixes(p);
    expect(r.steps.length).toBeGreaterThan(0);
    expect(r.scoreAfter).toBeGreaterThan(r.scoreBefore);
    expect(analyzePlan(r.plan).overallScore).toBe(r.scoreAfter);
    const v = validatePlan(r.plan);
    expect(v.overlapCount).toBe(0);
    expect(v.outsideCount).toBe(0);
  });

  it("leaves an already-aligned plan alone", () => {
    const p = plan([room("k", "kitchen", 9, 9), room("m", "master_bed", 0, 9)]);
    expect(planFixes(p).steps).toEqual([]);
  });

  it("never moves a room the user chose to keep", () => {
    const p = plan([room("b", "bathroom", 9, 0), room("k", "kitchen", 0, 0)]);
    const r = planFixes(p, 6, ["b"]);
    expect(r.steps.every((s) => s.roomId !== "b")).toBe(true);
  });
});
