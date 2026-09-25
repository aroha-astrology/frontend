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

// ── Plan validity ────────────────────────────────────────────────────────────
// Rooms are rectangles; the plot is any simple polygon. These are exact checks
// against the real outline, not its bounding box.

const EPS = 1e-6;

/** Twice the signed area of triangle abc (>0 = counter-clockwise in y-up terms). */
function cross(a: Pt, b: Pt, c: Pt): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function onSegment(p: Pt, a: Pt, b: Pt): boolean {
  return (
    Math.abs(cross(a, b, p)) < EPS &&
    p.x >= Math.min(a.x, b.x) - EPS &&
    p.x <= Math.max(a.x, b.x) + EPS &&
    p.y >= Math.min(a.y, b.y) - EPS &&
    p.y <= Math.max(a.y, b.y) + EPS
  );
}

/** True when segments ab and cd cross at a single interior point (touching/collinear doesn't count). */
export function segmentsCross(a: Pt, b: Pt, c: Pt, d: Pt): boolean {
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
  return (
    ((d1 > EPS && d2 < -EPS) || (d1 < -EPS && d2 > EPS)) &&
    ((d3 > EPS && d4 < -EPS) || (d3 < -EPS && d4 > EPS))
  );
}

/** Point in polygon; a point on the outline counts as inside. */
export function pointInPolygon(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (onSegment(p, a, b)) return true;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

function rectCorners(r: { x: number; y: number; w: number; h: number }): Pt[] {
  return [
    { x: r.x, y: r.y },
    { x: r.x + r.w, y: r.y },
    { x: r.x + r.w, y: r.y + r.h },
    { x: r.x, y: r.y + r.h },
  ];
}

/**
 * Whether a room rectangle lies fully inside the plot outline (edges may touch
 * it). All four corners must be inside, no plot corner may poke into the room,
 * and no plot edge may cut across it — together these catch concave notches
 * that a corners-only test misses.
 */
export function roomInsidePlot(room: { x: number; y: number; w: number; h: number }, plot: Pt[]): boolean {
  const corners = rectCorners(room);
  if (!corners.every((c) => pointInPolygon(c, plot))) return false;
  const strictlyInside = (p: Pt) =>
    p.x > room.x + EPS && p.x < room.x + room.w - EPS && p.y > room.y + EPS && p.y < room.y + room.h - EPS;
  if (plot.some(strictlyInside)) return false;
  for (let i = 0; i < plot.length; i++) {
    const a = plot[i];
    const b = plot[(i + 1) % plot.length];
    for (let k = 0; k < 4; k++) {
      if (segmentsCross(a, b, corners[k], corners[(k + 1) % 4])) return false;
    }
  }
  return true;
}

/** Two rooms share floor area (touching walls is fine). */
export function roomsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return ox > EPS && oy > EPS;
}

/** The plot outline crosses itself (e.g. a corner dragged across the opposite side). */
export function polygonSelfIntersects(plot: Pt[]): boolean {
  const n = plot.length;
  for (let i = 0; i < n; i++) {
    const a = plot[i];
    const b = plot[(i + 1) % n];
    for (let j = i + 1; j < n; j++) {
      // Adjacent edges share a corner — not a crossing.
      if (j === i || (j + 1) % n === i || (i + 1) % n === j) continue;
      if (segmentsCross(a, b, plot[j], plot[(j + 1) % n])) return true;
    }
  }
  return false;
}
