// Reducer + helpers for the Vastu planner's editable plan (polygon plot).

import type { Plan, Room, Fixture, Wall, Pt } from "@/lib/vastu/types";
import { PLAN_DEFAULTS } from "@/lib/vastu/types";
import { bbox, regularPolygon } from "@/lib/vastu/geometry";
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

function rectPlot(span: number): Pt[] {
  return [
    { x: 0, y: 0 },
    { x: span, y: 0 },
    { x: span, y: span },
    { x: 0, y: span },
  ];
}

export function initialPlan(): Plan {
  return { plot: rectPlot(PLAN_DEFAULTS.span), northOffsetDeg: 0, rooms: [] };
}

/** Clamp a room fully inside the plot's bounding box. */
function clampRoom(r: Room, bb: ReturnType<typeof bbox>): Room {
  const w = Math.min(r.w, bb.w);
  const h = Math.min(r.h, bb.h);
  return {
    ...r,
    w,
    h,
    x: clamp(r.x, bb.minX, bb.maxX - w),
    y: clamp(r.y, bb.minY, bb.maxY - h),
  };
}

export function makeRoom(type: string, plan: Plan): Room {
  const bb = bbox(plan.plot);
  const w = PLAN_DEFAULTS.roomW;
  const h = PLAN_DEFAULTS.roomH;
  const n = plan.rooms.length;
  const jitter = (n % 4) * PLAN_DEFAULTS.gridU * 2;
  const cx = (bb.minX + bb.maxX) / 2;
  const cy = (bb.minY + bb.maxY) / 2;
  const x = clamp(snap(cx - w / 2 + jitter), bb.minX, bb.maxX - w);
  const y = clamp(snap(cy - h / 2 + jitter), bb.minY, bb.maxY - h);
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
  | { type: "scalePlot"; widthU: number; heightU: number }
  | { type: "setSides"; sides: number }
  | { type: "moveVertex"; index: number; x: number; y: number }
  | { type: "addVertex"; edgeIndex: number }
  | { type: "deleteVertex"; index: number }
  | { type: "setNorthOffset"; deg: number };

function mapRoom(plan: Plan, id: string, fn: (r: Room) => Room): Plan {
  return { ...plan, rooms: plan.rooms.map((r) => (r.id === id ? fn(r) : r)) };
}

export function planReducer(plan: Plan, action: PlanAction): Plan {
  const bb = bbox(plan.plot);
  switch (action.type) {
    case "reset":
      return initialPlan();

    case "load":
      return normalizePlan(action.plan);

    case "addRoom":
      return { ...plan, rooms: [...plan.rooms, makeRoom(action.roomType, plan)] };

    case "moveRoom":
      return mapRoom(plan, action.id, (r) => ({
        ...r,
        x: clamp(snap(action.x), bb.minX, bb.maxX - r.w),
        y: clamp(snap(action.y), bb.minY, bb.maxY - r.h),
      }));

    case "resizeRoom": {
      const min = PLAN_DEFAULTS.minRoomU;
      let { x, y, w, h } = action.rect;
      x = snap(x);
      y = snap(y);
      w = clamp(snap(w), min, bb.w);
      h = clamp(snap(h), min, bb.h);
      x = clamp(x, bb.minX, bb.maxX - w);
      y = clamp(y, bb.minY, bb.maxY - h);
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
        x: clamp(snap(src.x + PLAN_DEFAULTS.gridU * 2), bb.minX, bb.maxX - src.w),
        y: clamp(snap(src.y + PLAN_DEFAULTS.gridU * 2), bb.minY, bb.maxY - src.h),
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

    case "scalePlot": {
      const newW = clamp(snap(action.widthU), 6, 40);
      const newH = clamp(snap(action.heightU), 6, 40);
      const sx = bb.w > 0 ? newW / bb.w : 1;
      const sy = bb.h > 0 ? newH / bb.h : 1;
      const plot = plan.plot.map((p) => ({
        x: snap(bb.minX + (p.x - bb.minX) * sx),
        y: snap(bb.minY + (p.y - bb.minY) * sy),
      }));
      const nb = bbox(plot);
      return { ...plan, plot, rooms: plan.rooms.map((r) => clampRoom(r, nb)) };
    }

    case "setSides": {
      const sides = clamp(Math.round(action.sides), PLAN_DEFAULTS.minSides, PLAN_DEFAULTS.maxSides);
      const cx = (bb.minX + bb.maxX) / 2;
      const cy = (bb.minY + bb.maxY) / 2;
      const radius = Math.min(bb.w, bb.h) / 2 || PLAN_DEFAULTS.span / 2;
      const plot = regularPolygon(sides, cx, cy, radius).map((p) => ({ x: snap(p.x), y: snap(p.y) }));
      return { ...plan, plot };
    }

    case "moveVertex": {
      if (action.index < 0 || action.index >= plan.plot.length) return plan;
      const plot = plan.plot.map((p, i) =>
        i === action.index ? { x: snap(action.x), y: snap(action.y) } : p,
      );
      return { ...plan, plot };
    }

    case "addVertex": {
      const i = action.edgeIndex;
      const a = plan.plot[i];
      const b = plan.plot[(i + 1) % plan.plot.length];
      if (!a || !b) return plan;
      const mid = { x: snap((a.x + b.x) / 2), y: snap((a.y + b.y) / 2) };
      const plot = [...plan.plot.slice(0, i + 1), mid, ...plan.plot.slice(i + 1)];
      return { ...plan, plot };
    }

    case "deleteVertex": {
      if (plan.plot.length <= PLAN_DEFAULTS.minSides) return plan;
      return { ...plan, plot: plan.plot.filter((_, i) => i !== action.index) };
    }

    case "setNorthOffset":
      return { ...plan, northOffsetDeg: ((action.deg % 360) + 360) % 360 };

    default:
      return plan;
  }
}

/** Back-compat + safety: ensure a loaded plan has a valid polygon plot. */
export function normalizePlan(raw: unknown): Plan {
  const p = raw as Partial<Plan> & { widthU?: number; heightU?: number };
  let plot = Array.isArray(p.plot) && p.plot.length >= 3 ? (p.plot as Pt[]) : null;
  if (!plot) {
    // Migrate an older { widthU, heightU } plan to a rectangle polygon.
    const w = typeof p.widthU === "number" ? p.widthU : PLAN_DEFAULTS.span;
    const h = typeof p.heightU === "number" ? p.heightU : PLAN_DEFAULTS.span;
    plot = [
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: w, y: h },
      { x: 0, y: h },
    ];
  }
  return {
    plot,
    northOffsetDeg: typeof p.northOffsetDeg === "number" ? p.northOffsetDeg : 0,
    rooms: Array.isArray(p.rooms) ? (p.rooms as Room[]) : [],
  };
}

export function samplePlan(): Plan {
  const span = PLAN_DEFAULTS.span;
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
    plot: rectPlot(span),
    northOffsetDeg: 0,
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
