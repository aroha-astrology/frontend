import { describe, expect, it } from "vitest";
import type { Plan, Room } from "./types";
import { validatePlan } from "./validation";
import { analyzePlan } from "./analysis";

const lShape = [
  { x: 0, y: 0 },
  { x: 6, y: 0 },
  { x: 6, y: 6 },
  { x: 12, y: 6 },
  { x: 12, y: 12 },
  { x: 0, y: 12 },
];
const room = (id: string, x: number, y: number, type = "bathroom"): Room => ({ id, type, x, y, w: 2, h: 2, fixtures: [] });
const plan = (rooms: Room[], plot = lShape): Plan => ({ plot, northOffsetDeg: 0, rooms });

describe("validatePlan", () => {
  it("an empty plan is not ready for a report", () => {
    expect(validatePlan(plan([])).reportReady).toBe(false);
  });

  it("a room outside the outline blocks the report", () => {
    const v = validatePlan(plan([room("a", 1, 1), room("b", 8, 1)]));
    expect(v.roomIssues.b).toEqual(["outside"]);
    expect(v.roomIssues.a).toBeUndefined();
    expect(v.outsideCount).toBe(1);
    expect(v.validRoomCount).toBe(1);
    expect(v.reportReady).toBe(false);
  });

  it("overlap is a warning, not a blocker", () => {
    const v = validatePlan(plan([room("a", 1, 7), room("b", 2, 8)]));
    expect(v.roomIssues.a).toEqual(["overlap"]);
    expect(v.roomIssues.b).toEqual(["overlap"]);
    expect(v.overlapCount).toBe(2);
    expect(v.reportReady).toBe(true);
  });

  it("a self-crossing outline makes every room invalid", () => {
    const bowtie = [
      { x: 0, y: 0 },
      { x: 12, y: 12 },
      { x: 12, y: 0 },
      { x: 0, y: 12 },
    ];
    const v = validatePlan(plan([room("a", 5, 5)], bowtie));
    expect(v.plotInvalid).toBe(true);
    expect(v.reportReady).toBe(false);
  });
});

describe("duplicate room types", () => {
  it("two bathrooms are rated independently", () => {
    const a = analyzePlan(plan([room("b1", 0, 10), room("b2", 10, 10)], [
      { x: 0, y: 0 },
      { x: 12, y: 0 },
      { x: 12, y: 12 },
      { x: 0, y: 12 },
    ]));
    const [b1, b2] = a.rooms;
    expect(b1.roomId).toBe("b1");
    expect(b2.roomId).toBe("b2");
    expect(b1.zone).toBe("SW");
    expect(b2.zone).toBe("SE");
  });
});
