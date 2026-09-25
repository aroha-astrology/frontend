// Advanced Vastu visual guides: the 16-zone wheel and the 9×9 Vastu Purusha
// Mandala (pada grid). Pure, no React. Display-only — nothing here feeds the
// score, which stays on the 8-direction rules in geometry.ts / rules.ts.
//
// Coordinates: plot units, SVG y-down. `northOffsetDeg` is the real-world
// bearing that screen-up points to, so real north sits at screen bearing
// −northOffsetDeg (see lens.ts `toScreenBearing`).

import type { Plan, Pt } from "./types";
import { planCenter, bbox } from "./geometry";
import { polar, sectorPath, toScreenBearing } from "./lens";

export type Dir16 =
  | "N" | "NNE" | "NE" | "ENE"
  | "E" | "ESE" | "SE" | "SSE"
  | "S" | "SSW" | "SW" | "WSW"
  | "W" | "WNW" | "NW" | "NNW";

const DIR16_CW: Dir16[] = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];

/** The 16 traditional directions, clockwise from North, 22.5° apart. */
export const ZONES16: readonly { zone: Dir16; bearing: number }[] = DIR16_CW.map((zone, i) => ({ zone, bearing: i * 22.5 }));

export interface Sector16 {
  zone: Dir16;
  /** Real-world bearing of the sector's centre line. */
  bearing: number;
  path: string;
  /** Label position: just inside the plot edge along the sector's centre line. */
  labelAt: Pt;
}

/**
 * Distance from `from` along screen bearing `screenBearingDeg` to the farthest
 * crossing of the plot outline (or null if the ray never meets it).
 */
export function rayToEdge(plot: Pt[], from: Pt, screenBearingDeg: number): number | null {
  const rad = (screenBearingDeg * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  let best: number | null = null;
  for (let i = 0; i < plot.length; i++) {
    const a = plot[i];
    const b = plot[(i + 1) % plot.length];
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-12) continue;
    const wx = a.x - from.x;
    const wy = a.y - from.y;
    const t = (wx * ey - wy * ex) / den; // along the ray
    const s = (wx * dy - wy * dx) / den; // along the edge
    if (t > 1e-9 && s >= -1e-9 && s <= 1 + 1e-9 && (best === null || t > best)) best = t;
  }
  return best;
}

/** How far inside the plot edge the 16-zone labels sit (plot units). */
export const LABEL_INSET = 0.75;

/** The 16 direction wedges (±11.25°) out to `radius`; clip them to the plot. */
export function sixteenSectors(plan: Plan, radius: number): Sector16[] {
  const c = planCenter(plan);
  return ZONES16.map(({ zone, bearing }) => {
    const sb = toScreenBearing(bearing, plan.northOffsetDeg);
    const edge = rayToEdge(plan.plot, c, sb);
    const r = edge === null ? radius * 0.62 : Math.min(radius * 0.9, Math.max(edge * 0.55, edge - LABEL_INSET));
    return { zone, bearing, path: sectorPath(plan, bearing, 11.25, radius), labelAt: polar(c, sb, r) };
  });
}

// ── Vastu Purusha Mandala ────────────────────────────────────────────────────

export interface PadaCell {
  /** 0 = the real-north row. */
  row: number;
  /** 0 = the real-west column. */
  col: number;
  polygon: Pt[];
  /** 0 = central cell, 1 = the ring around it, … */
  ring: number;
}

export interface PadaGrid {
  cells: PadaCell[];
  /** Polygon of the central 3×3 block (the traditional Brahmasthan). */
  brahmasthan: Pt[];
  lines: { a: Pt; b: Pt }[];
}

/** The grid frame: centre, real-east/real-south unit vectors, half side. */
function frame(plan: Plan) {
  const c = planCenter(plan);
  const off = (plan.northOffsetDeg * Math.PI) / 180;
  // Real north points to screen bearing −off: (−sin off, −cos off).
  const east: Pt = { x: Math.cos(off), y: -Math.sin(off) };
  const south: Pt = { x: Math.sin(off), y: Math.cos(off) };
  const bb = bbox(plan.plot);
  const corners: Pt[] = [
    { x: bb.minX, y: bb.minY },
    { x: bb.maxX, y: bb.minY },
    { x: bb.maxX, y: bb.maxY },
    { x: bb.minX, y: bb.maxY },
  ];
  let half = 0;
  for (const p of corners) {
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    half = Math.max(half, Math.abs(dx * east.x + dy * east.y), Math.abs(dx * south.x + dy * south.y));
  }
  if (half <= 0) half = 1;
  const toScreen = (u: number, v: number): Pt => ({ x: c.x + u * east.x + v * south.x, y: c.y + u * east.y + v * south.y });
  const toLocal = (p: Pt) => {
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    return { u: dx * east.x + dy * east.y, v: dx * south.x + dy * south.y };
  };
  return { c, half, toScreen, toLocal };
}

/**
 * The Vastu Purusha Mandala: an n×n square grid centred on the plot centre,
 * aligned to real north, sized to cover the plot's bounding box.
 */
export function padaGrid(plan: Plan, n = 9): PadaGrid {
  const N = Math.max(1, Math.round(n));
  const { half, toScreen } = frame(plan);
  const side = (2 * half) / N;
  const mid = (N - 1) / 2;
  const cells: PadaCell[] = [];
  for (let row = 0; row < N; row++) {
    for (let col = 0; col < N; col++) {
      const u0 = -half + col * side;
      const v0 = -half + row * side;
      cells.push({
        row,
        col,
        polygon: [toScreen(u0, v0), toScreen(u0 + side, v0), toScreen(u0 + side, v0 + side), toScreen(u0, v0 + side)],
        ring: Math.floor(Math.max(Math.abs(row - mid), Math.abs(col - mid))),
      });
    }
  }
  const b = Math.min(1.5 * side, half);
  const brahmasthan = [toScreen(-b, -b), toScreen(b, -b), toScreen(b, b), toScreen(-b, b)];
  const lines: { a: Pt; b: Pt }[] = [];
  for (let i = 0; i <= N; i++) {
    const k = -half + i * side;
    lines.push({ a: toScreen(k, -half), b: toScreen(k, half) });
    lines.push({ a: toScreen(-half, k), b: toScreen(half, k) });
  }
  return { cells, brahmasthan, lines };
}

/** Which pada a screen point falls in, or null when it's outside the grid. */
export function cellAt(plan: Plan, p: Pt, n = 9): { row: number; col: number } | null {
  const N = Math.max(1, Math.round(n));
  const { half, toLocal } = frame(plan);
  const side = (2 * half) / N;
  const { u, v } = toLocal(p);
  const eps = 1e-9;
  if (Math.abs(u) > half + eps || Math.abs(v) > half + eps) return null;
  const col = Math.min(N - 1, Math.max(0, Math.floor((u + half) / side)));
  const row = Math.min(N - 1, Math.max(0, Math.floor((v + half) / side)));
  return { row, col };
}
