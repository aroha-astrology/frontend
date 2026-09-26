// Undo/redo for the planner. Pure, no React.
//
// Every discrete edit (add, delete, duplicate, a door added, plot resized, a
// suggested fix applied) is one undo step. Continuous edits — dragging a room,
// a corner, a door, the north slider — would otherwise create hundreds of
// steps, so they only record a step when a gesture begins (`beginGesture`,
// dispatched on pointer-down) and then keep updating that same step.

import type { Plan } from "./types";
import { planReducer, normalizePlan, type PlanAction } from "./planState";

export interface PlanHistory {
  past: Plan[];
  present: Plan;
  future: Plan[];
  /** A gesture has begun and hasn't recorded its step yet. */
  armed: boolean;
}

export type StudioAction =
  | PlanAction
  | { type: "undo" }
  | { type: "redo" }
  | { type: "beginGesture" }
  | { type: "endGesture" }
  /** Swap in a whole plan as ONE undoable step (reopening a report's plan, a template). */
  | { type: "replace"; plan: Plan };

const CONTINUOUS = new Set<PlanAction["type"]>(["moveRoom", "resizeRoom", "moveFixture", "moveVertex", "setNorthOffset"]);
const MAX_STEPS = 100;

export function initialHistory(present: Plan): PlanHistory {
  return { past: [], present, future: [], armed: false };
}

function record(h: PlanHistory, next: Plan): PlanHistory {
  return { past: [...h.past, h.present].slice(-MAX_STEPS), present: next, future: [], armed: false };
}

export function historyReducer(h: PlanHistory, action: StudioAction): PlanHistory {
  switch (action.type) {
    case "undo": {
      const prev = h.past[h.past.length - 1];
      if (!prev) return h;
      return { past: h.past.slice(0, -1), present: prev, future: [h.present, ...h.future], armed: false };
    }
    case "redo": {
      const next = h.future[0];
      if (!next) return h;
      return { past: [...h.past, h.present], present: next, future: h.future.slice(1), armed: false };
    }
    case "beginGesture":
      return h.armed ? h : { ...h, armed: true };
    case "endGesture":
      return h.armed ? { ...h, armed: false } : h;
    case "load":
      // A different home/profile loaded: its own fresh history.
      return initialHistory(planReducer(h.present, action));
    case "replace":
      return record(h, normalizePlan(action.plan));
    default: {
      const next = planReducer(h.present, action);
      if (next === h.present) return h;
      if (CONTINUOUS.has(action.type)) {
        return h.armed ? record(h, next) : { ...h, present: next };
      }
      return record(h, next);
    }
  }
}
