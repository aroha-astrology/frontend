// Reducer + helpers for the Vastu planner's editable plan.
// Pure state logic — no React rendering here.

import type { Plan, Room, Fixture, Wall } from "@/lib/vastu/types";
import { PLAN_DEFAULTS } from "@/lib/vastu/types";
import { getRoomType, ROOM_TYPES } from "@/lib/vastu/data";

export function uid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

export function snap(v: number, grid = PLAN_DEFAULTS.gridU): number {
  return Math.round(v / grid) * grid;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function initialPlan(): Plan {
  return {
    widthU: PLAN_DEFAULTS.widthU,
    heightU: PLAN_DEFAULTS.heightU,
    northOffsetDeg: 0,
    rooms: [],
  };
}

/** Places a new room roughly centred, nudged so stacked adds don't fully overlap. */
export function makeRoom(type: string, plan: Plan): Room {
  const w = PLAN_DEFAULTS.roomW;
  const h = PLAN_DEFAULTS.roomH;
  const n = plan.rooms.length;
  const jitter = (n % 4) * PLAN_DEFAULTS.gridU * 2;
  const x = clamp(snap(plan.widthU / 2 - w / 2 + jitter), 0, plan.widthU - w);
  const y = clamp(snap(plan.heightU / 2 - h / 2 + jitter), 0, plan.heightU - h);
  return { id: uid(), type, x, y, w, h, fixtures: [] };
}

export type PlanAction =
  | { type: "reset" }
  | { type: "load"; plan: Plan }
  | { type: "addRoom"; roomType: string }
  | { type: "moveRoom"; id: string; x: number; y: number }
  | { type: "resizeRoom"; id: string; rect: { x: number; y: number; w: number; h: number } }
  | { type: "deleteRoom"; id: string }
  | { type: "duplicateRoom"; id: string }
  | { type: "addFixture"; roomId: string; kind: "door" | "window" }
  | { type: "moveFixture"; roomId: string; fixtureId: string; wall: Wall; t: number }
  | { type: "deleteFixture"; roomId: string; fixtureId: string }
  | { type: "setHouseSize"; widthU: number; heightU: number }
  | { type: "setNorthOffset"; deg: number };

function mapRoom(plan: Plan, id: string, fn: (r: Room) => Room): Plan {
  return { ...plan, rooms: plan.rooms.map((r) => (r.id === id ? fn(r) : r)) };
}

export function planReducer(plan: Plan, action: PlanAction): Plan {
  switch (action.type) {
    case "reset":
      return initialPlan();

    case "load":
      return action.plan;

    case "addRoom":
      return { ...plan, rooms: [...plan.rooms, makeRoom(action.roomType, plan)] };

    case "moveRoom":
      return mapRoom(plan, action.id, (r) => ({
        ...r,
        x: clamp(snap(action.x), 0, plan.widthU - r.w),
        y: clamp(snap(action.y), 0, plan.heightU - r.h),
      }));

    case "resizeRoom": {
      const min = PLAN_DEFAULTS.minRoomU;
      let { x, y, w, h } = action.rect;
      x = snap(x);
      y = snap(y);
      w = snap(w);
      h = snap(h);
      // Keep inside the plot and above the minimum size.
      w = clamp(w, min, plan.widthU);
      h = clamp(h, min, plan.heightU);
      x = clamp(x, 0, plan.widthU - w);
      y = clamp(y, 0, plan.heightU - h);
      return mapRoom(plan, action.id, (r) => ({ ...r, x, y, w, h }));
    }

    case "deleteRoom":
      return { ...plan, rooms: plan.rooms.filter((r) => r.id !== action.id) };

    case "duplicateRoom": {
      const src = plan.rooms.find((r) => r.id === action.id);
      if (!src) return plan;
      const copy: Room = {
        ...src,
        id: uid(),
        x: clamp(snap(src.x + PLAN_DEFAULTS.gridU * 2), 0, plan.widthU - src.w),
        y: clamp(snap(src.y + PLAN_DEFAULTS.gridU * 2), 0, plan.heightU - src.h),
        fixtures: src.fixtures.map((f) => ({ ...f, id: uid() })),
      };
      return { ...plan, rooms: [...plan.rooms, copy] };
    }

    case "addFixture": {
      const fixture: Fixture = { id: uid(), kind: action.kind, wall: "bottom", t: 0.5 };
      return mapRoom(plan, action.roomId, (r) => ({ ...r, fixtures: [...r.fixtures, fixture] }));
    }

    case "moveFixture":
      return mapRoom(plan, action.roomId, (r) => ({
        ...r,
        fixtures: r.fixtures.map((f) =>
          f.id === action.fixtureId ? { ...f, wall: action.wall, t: clamp(action.t, 0, 1) } : f,
        ),
      }));

    case "deleteFixture":
      return mapRoom(plan, action.roomId, (r) => ({
        ...r,
        fixtures: r.fixtures.filter((f) => f.id !== action.fixtureId),
      }));

    case "setHouseSize": {
      const widthU = clamp(snap(action.widthU), 6, 40);
      const heightU = clamp(snap(action.heightU), 6, 40);
      // Re-clamp rooms so a shrink doesn't push them outside the plot.
      const rooms = plan.rooms.map((r) => {
        const w = Math.min(r.w, widthU);
        const h = Math.min(r.h, heightU);
        return { ...r, w, h, x: clamp(r.x, 0, widthU - w), y: clamp(r.y, 0, heightU - h) };
      });
      return { ...plan, widthU, heightU, rooms };
    }

    case "setNorthOffset":
      return { ...plan, northOffsetDeg: ((action.deg % 360) + 360) % 360 };

    default:
      return plan;
  }
}

/** A ready-to-use sample home so first-time users see something meaningful. */
export function samplePlan(): Plan {
  const p = initialPlan();
  const add = (type: string, x: number, y: number, w: number, h: number, fixtures: Fixture[] = []): Room => ({
    id: uid(),
    type,
    x,
    y,
    w,
    h,
    fixtures,
  });
  return {
    ...p,
    rooms: [
      add("puja_room", 8, 0, 4, 3),
      add("living", 0, 0, 5, 4, [{ id: uid(), kind: "door", wall: "top", t: 0.5 }]),
      add("kitchen", 8.5, 8.5, 3.5, 3.5),
      add("master_bed", 0, 8, 4.5, 4),
      add("bathroom", 0, 4.5, 3, 3),
    ].filter((r) => getRoomType(r.type)),
  };
}

export { ROOM_TYPES };
