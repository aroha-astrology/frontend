// Direction-tracing geometry for the Vastu planner. Pure, no React.
//
// Coordinate system: plot-relative units, origin (0,0) at the TOP-LEFT of the
// plot, x → right, y → DOWN (SVG convention). The plot centre is the
// Brahmasthan. A room's Vastu direction is the compass sector its centroid
// falls into relative to that centre, after applying the plan's real-world
// orientation (`northOffsetDeg`).

import type { Dir8, Zone, Room, Plan, Wall } from "./types";
import { DIR8_CW } from "./data";

/** Fraction of the plot half-diagonal within which a room counts as central. */
const BRAHMASTHAN_RADIUS_FRAC = 0.12;

export interface Pt {
  x: number;
  y: number;
}

export function roomCentroid(room: Room): Pt {
  return { x: room.x + room.w / 2, y: room.y + room.h / 2 };
}

export function planCenter(plan: Plan): Pt {
  return { x: plan.widthU / 2, y: plan.heightU / 2 };
}

/**
 * Screen bearing of a vector, in degrees clockwise from screen-up (north-up):
 * up = 0, right(E) = 90, down(S) = 180, left(W) = 270. `dy` uses SVG's
 * y-down convention, so up is negative dy.
 */
export function screenBearing(dx: number, dy: number): number {
  const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return (deg + 360) % 360;
}

/** Snap a real-world bearing (0=N, clockwise) to one of the 8 directions. */
export function bearingToDir8(bearing: number): Dir8 {
  const idx = Math.round(((bearing % 360) + 360) % 360 / 45) % 8;
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

  const halfDiag = Math.hypot(plan.widthU, plan.heightU) / 2;
  const dist = Math.hypot(dx, dy);
  if (halfDiag === 0 || dist < halfDiag * BRAHMASTHAN_RADIUS_FRAC) return "C";

  const realBearing = (screenBearing(dx, dy) + plan.northOffsetDeg) % 360;
  return bearingToDir8(realBearing);
}

const WALL_SCREEN_BEARING: Record<Wall, number> = {
  top: 0, // outward normal points up → North
  right: 90,
  bottom: 180,
  left: 270,
};

/**
 * The real-world facing direction of a door/window: the outward normal of its
 * wall, rotated by the plan's orientation, snapped to 8 directions.
 */
export function fixtureFacing(wall: Wall, plan: Plan): Dir8 {
  const realBearing = (WALL_SCREEN_BEARING[wall] + plan.northOffsetDeg) % 360;
  return bearingToDir8(realBearing);
}

/** Absolute unit position of a fixture's midpoint on its room wall. */
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

/**
 * Builds the roomLayout map (room key → directions[]) the rules engine expects,
 * from the current plan. A room over the centre contributes no direction. The
 * house entrance is driven by its main door's facing, not the room's centroid,
 * so the entrance rule rates where the door opens.
 */
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
    if (!dir) continue; // central room → skip
    (layout[room.type] ??= []).push(dir);
  }
  return layout;
}

/** "C" (Brahmasthan) has no rules direction; everything else passes through. */
function zoneToDir(zone: Zone): string {
  return zone === "C" ? "" : zone;
}
