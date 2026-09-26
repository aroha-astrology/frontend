import { describe, expect, it } from "vitest";
import { historyReducer, initialHistory, type PlanHistory, type StudioAction } from "./history";
import type { Plan } from "./types";

const base: Plan = {
  plot: [
    { x: 0, y: 0 },
    { x: 12, y: 0 },
    { x: 12, y: 12 },
    { x: 0, y: 12 },
  ],
  northOffsetDeg: 0,
  rooms: [{ id: "k", type: "kitchen", x: 0, y: 0, w: 3, h: 3, fixtures: [] }],
};
const run = (h: PlanHistory, ...actions: StudioAction[]) => actions.reduce(historyReducer, h);

describe("undo / redo", () => {
  it("a discrete edit is one step, undone and redone", () => {
    const h = run(initialHistory(base), { type: "addRoom", roomType: "store" });
    expect(h.present.rooms).toHaveLength(2);
    const u = run(h, { type: "undo" });
    expect(u.present.rooms).toHaveLength(1);
    const r = run(u, { type: "redo" });
    expect(r.present.rooms).toHaveLength(2);
  });

  it("a whole drag is one step", () => {
    const h = run(
      initialHistory(base),
      { type: "beginGesture" },
      { type: "moveRoom", id: "k", x: 1, y: 0 },
      { type: "moveRoom", id: "k", x: 2, y: 0 },
      { type: "moveRoom", id: "k", x: 3, y: 0 },
      { type: "endGesture" },
    );
    expect(h.present.rooms[0].x).toBe(3);
    expect(h.past).toHaveLength(1);
    expect(run(h, { type: "undo" }).present.rooms[0].x).toBe(0);
  });

  it("a tap without movement records nothing", () => {
    const h = run(initialHistory(base), { type: "beginGesture" }, { type: "endGesture" });
    expect(h.past).toHaveLength(0);
  });

  it("a new edit clears redo", () => {
    const h = run(initialHistory(base), { type: "addRoom", roomType: "store" }, { type: "undo" }, { type: "addRoom", roomType: "dining" });
    expect(h.future).toHaveLength(0);
    expect(run(h, { type: "redo" }).present.rooms.map((r) => r.type)).toEqual(["kitchen", "dining"]);
  });

  it("loading another home starts a fresh history; replacing is undoable", () => {
    const edited = run(initialHistory(base), { type: "addRoom", roomType: "store" });
    expect(run(edited, { type: "load", plan: base }).past).toHaveLength(0);
    const replaced = run(edited, { type: "replace", plan: { ...base, rooms: [] } });
    expect(replaced.present.rooms).toHaveLength(0);
    expect(run(replaced, { type: "undo" }).present.rooms).toHaveLength(2);
  });

  it("undo with nothing to undo is a no-op", () => {
    const h = initialHistory(base);
    expect(run(h, { type: "undo" })).toBe(h);
  });
});
