// Geometry + colouring for the Vastu Lens overlay. Pure, no React.
//
// The lens tints the plot by direction. With a room selected it answers "where
// should THIS room go?" — each sector coloured by what the rule set says about
// that room type there. With nothing selected it shows the eight zones and
// their elements.

import type { Dir8, Plan, Pt } from "./types";
import { DIR8_CW } from "./data";
import { getRule } from "./rules";
import { planCenter } from "./geometry";

export const DIR_BEARING: Record<Dir8, number> = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315 };

export type ZoneFit = "ideal" | "acceptable" | "neutral" | "avoid";

/** What the rule set says about `roomType` in direction `dir`. */
export function zoneFit(roomType: string, dir: Dir8): ZoneFit {
  const rule = getRule(roomType);
  if (!rule) return "neutral";
  if (rule.idealDirections.includes(dir)) return "ideal";
  if (rule.acceptableDirections.includes(dir)) return "acceptable";
  if (rule.avoidDirections.includes(dir)) return "avoid";
  return "neutral";
}

export const FIT_HEX: Record<ZoneFit, string> = {
  ideal: "#21D88A",
  acceptable: "#A3E635",
  neutral: "#F3C74B",
  avoid: "#FF6767",
};

/** Screen point at `screenBearing` degrees (clockwise from screen-up) and distance r. */
export function polar(c: Pt, screenBearingDeg: number, r: number): Pt {
  const rad = (screenBearingDeg * Math.PI) / 180;
  return { x: c.x + r * Math.sin(rad), y: c.y - r * Math.cos(rad) };
}

/** Real-world bearing → where it points on screen, given the plan's north offset. */
export function toScreenBearing(realBearing: number, northOffsetDeg: number): number {
  return (((realBearing - northOffsetDeg) % 360) + 360) % 360;
}

/**
 * The wedge a direction owns (its bearing ± half the sector width), as an SVG
 * path from the plot centre out to `radius`. Clip it to the plot outline.
 */
export function sectorPath(plan: Plan, bearing: number, halfWidth: number, radius: number): string {
  const c = planCenter(plan);
  const from = toScreenBearing(bearing - halfWidth, plan.northOffsetDeg);
  const steps = 6;
  const pts: Pt[] = [];
  for (let i = 0; i <= steps; i++) pts.push(polar(c, from + (2 * halfWidth * i) / steps, radius));
  return `M${c.x} ${c.y} ` + pts.map((p) => `L${p.x} ${p.y}`).join(" ") + " Z";
}

export interface LensSector {
  dir: Dir8;
  path: string;
  /** Where the zone label sits. */
  labelAt: Pt;
  fit: ZoneFit | null;
}

/** The eight direction sectors; `fit` is set when a room type is given. */
export function lensSectors(plan: Plan, radius: number, roomType?: string): LensSector[] {
  const c = planCenter(plan);
  return DIR8_CW.map((dir) => ({
    dir,
    path: sectorPath(plan, DIR_BEARING[dir], 22.5, radius),
    labelAt: polar(c, toScreenBearing(DIR_BEARING[dir], plan.northOffsetDeg), radius * 0.62),
    fit: roomType ? zoneFit(roomType, dir) : null,
  }));
}
