import { describe, expect, it } from "vitest";
import { scoreBreakdown } from "./breakdown";
import { analyzePlan } from "./analysis";
import { templatePlan, TEMPLATE_IDS } from "./templates";
import { validatePlan } from "./validation";
import type { Plan } from "./types";

let n = 0;
const id = () => `id${n++}`;

describe("score breakdown", () => {
  it("counts ratings and lists issues worst-first", () => {
    const plan: Plan = {
      plot: [
        { x: 0, y: 0 },
        { x: 12, y: 0 },
        { x: 12, y: 12 },
        { x: 0, y: 12 },
      ],
      northOffsetDeg: 0,
      rooms: [
        { id: "k", type: "kitchen", x: 9, y: 9, w: 3, h: 3, fixtures: [] }, // SE ideal
        { id: "b", type: "bathroom", x: 9, y: 0, w: 3, h: 3, fixtures: [] }, // NE avoid
        { id: "s", type: "store", x: 5, y: 9, w: 2, h: 3, fixtures: [] }, // S acceptable
      ],
    };
    const b = scoreBreakdown(plan, analyzePlan(plan));
    expect(b.aligned).toBe(1);
    expect(b.acceptable).toBe(1);
    expect(b.correction).toBe(1);
    expect(b.issues.map((r) => r.roomId)).toEqual(["b", "s"]);
    expect(b.plotShape).toBe("good");
    expect(b.entrance).toBe("none");
  });
});

describe("starter templates", () => {
  it.each(TEMPLATE_IDS)("%s is valid and well placed", (t) => {
    const plan = templatePlan(t, id);
    const v = validatePlan(plan);
    expect(v.outsideCount).toBe(0);
    expect(v.overlapCount).toBe(0);
    if (plan.rooms.length) {
      const a = analyzePlan(plan);
      expect(a.rooms.filter((r) => r.ratingKey === "harmful")).toHaveLength(0);
      expect(a.overallScore).toBeGreaterThanOrEqual(85);
    }
  });

  it("every use gets fresh ids", () => {
    const a = templatePlan("2bhk", id);
    const b = templatePlan("2bhk", id);
    expect(a.rooms[0].id).not.toBe(b.rooms[0].id);
  });
});
