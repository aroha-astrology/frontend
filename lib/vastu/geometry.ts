// Direction-tracing geometry for the Vastu planner. Pure, no React.
//
// Coordinate system: plot-relative units, origin top-left, x → right, y → DOWN
// (SVG convention). The house is a polygon of >= 3 vertices; its centroid is
// the Brahmasthan. A room's Vastu direction is the compass sector its centroid
// falls into relative to that centre, after the plan's orientation offset.

import type { Dir8, Zone, Room, Plan, Wall, Pt } from "./types";
import { DIR8_CW } from "./data";

/** Fraction of the plot half-diagonal within which a room counts as central. */
const BRAHMASTHAN_RADIUS_FRAC = 0.12;

export function roomCentroid(room: Room): Pt {
  return { x: room.x + room.w / 2, y: room.y + room.h / 2 };
}

export interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  w: number;
  h: number;
}

export function bbox(plot: Pt[]): BBox {
  const xs = plot.map((p) => p.x);
  const ys = plot.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

/** Area-weighted polygon centroid (falls back to vertex average if degenerate). */
export function polygonCentroid(plot: Pt[]): Pt {
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < plot.length; i++) {
    const a = plot[i];
    const b = plot[(i + 1) % plot.length];
    const cross = a.x * b.y - b.x * a.y;
    area += cross;
    cx += (a.x + b.x) * cross;
    cy += (a.y + b.y) * cross;
  }
  area *= 0.5;
  if (Math.abs(area) < 1e-6) {
    const n = plot.length || 1;
    return { x: plot.reduce((s, p) => s + p.x, 0) / n, y: plot.reduce((s, p) => s + p.y, 0) / n };
  }
  return { x: cx / (6 * area), y: cy / (6 * area) };
}

export function planCenter(plan: Plan): Pt {
  return polygonCentroid(plan.plot);
}

/** Farthest vertex distance from the centroid — used to size the compass ring. */
export function maxVertexDist(plan: Plan): number {
  const c = planCenter(plan);
  return Math.max(...plan.plot.map((p) => Math.hypot(p.x - c.x, p.y - c.y)), 1);
}

/**
 * Screen bearing of a vector, degrees clockwise from screen-up (north-up):
 * up = 0, right(E) = 90, down(S) = 180, left(W) = 270. `dy` uses SVG's
 * y-down convention, so up is negative dy.
 */
export function screenBearing(dx: number, dy: number): number {
  const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return (deg + 360) % 360;
}

/** Snap a real-world bearing (0=N, clockwise) to one of the 8 directions. */
export function bearingToDir8(bearing: number): Dir8 {
  const idx = Math.round((((bearing % 360) + 360) % 360) / 45) % 8;
  return DIR8_CW[idx];
}

/**
 * The Vastu zone of a room: the 8-direction sector of its centroid relative to
 * the plot centre, rotated by the plan's real-world orientation. Returns "C"
 * when the room sits over the sacred centre.
 */
export function roomDirection(room: Room, plan: Plan): Zone {
  const c = roomCentroid(room);
  const center = planCenter(plan);
  const dx = c.x - center.x;
  const dy = c.y - center.y;

  const bb = bbox(plan.plot);
  const halfDiag = Math.hypot(bb.w, bb.h) / 2;
  const dist = Math.hypot(dx, dy);
  if (halfDiag === 0 || dist < halfDiag * BRAHMASTHAN_RADIUS_FRAC) return "C";

  const realBearing = (screenBearing(dx, dy) + plan.northOffsetDeg) % 360;
  return bearingToDir8(realBearing);
}

const WALL_SCREEN_BEARING: Record<Wall, number> = {
  top: 0,
  right: 90,
  bottom: 180,
  left: 270,
};

/** The real-world facing direction of a door/window. */
export function fixtureFacing(wall: Wall, plan: Plan): Dir8 {
  const realBearing = (WALL_SCREEN_BEARING[wall] + plan.northOffsetDeg) % 360;
  return bearingToDir8(realBearing);
}

export function fixturePoint(room: Room, wall: Wall, t: number): Pt {
  const clamp = Math.min(1, Math.max(0, t));
  switch (wall) {
    case "top":
      return { x: room.x + room.w * clamp, y: room.y };
    case "bottom":
      return { x: room.x + room.w * clamp, y: room.y + room.h };
    case "left":
      return { x: room.x, y: room.y + room.h * clamp };
    case "right":
      return { x: room.x + room.w, y: room.y + room.h * clamp };
  }
}

export function buildRoomLayout(plan: Plan): Record<string, string[]> {
  const layout: Record<string, string[]> = {};
  for (const room of plan.rooms) {
    let dir: string;
    if (room.type === "entrance") {
      const door = room.fixtures.find((f) => f.kind === "door");
      dir = door ? fixtureFacing(door.wall, plan) : zoneToDir(roomDirection(room, plan));
    } else {
      dir = zoneToDir(roomDirection(room, plan));
    }
    if (!dir) continue;
    (layout[room.type] ??= []).push(dir);
  }
  return layout;
}

function zoneToDir(zone: Zone): string {
  return zone === "C" ? "" : zone;
}

/** SVG path for the plot outline polygon. */
export function plotOutlinePath(plan: Plan): string {
  if (plan.plot.length === 0) return "";
  return plan.plot.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ") + " Z";
}

/** A regular N-gon centred at (cx,cy) with the given circumradius, flat-ish top. */
export function regularPolygon(sides: number, cx: number, cy: number, radius: number): Pt[] {
  const n = Math.max(3, Math.round(sides));
  const pts: Pt[] = [];
  // Start at the top (screen-up) and go clockwise.
  for (let i = 0; i < n; i++) {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    pts.push({ x: cx + radius * Math.cos(ang), y: cy + radius * Math.sin(ang) });
  }
  return pts;
}

/** Human/AI summary of the plot shape, e.g. "6-sided plot". */
export function plotSummary(plan: Plan): string {
  const n = plan.plot.length;
  if (n === 4) {
    const bb = bbox(plan.plot);
    const ratio = bb.w && bb.h ? Math.max(bb.w, bb.h) / Math.min(bb.w, bb.h) : 1;
    return ratio < 1.15 ? "square 4-sided plot" : "rectangular 4-sided plot";
  }
  return `${n}-sided plot`;
}
