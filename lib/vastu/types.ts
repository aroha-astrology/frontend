// Shared types for the Vastu 2D CAD planner.
// Pure — no React, no imports. Used by geometry, rules, the editor components,
// and the API client. Keep in sync with the backend copy in
// backend/src/modules/vastu/vastu.schemas.ts.

/** The 8 compass directions used for Vastu zoning. */
export type Dir8 = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

/** A room's computed direction can also be the sacred centre (Brahmasthan). */
export type Zone = Dir8 | "C";

/** Which edge of a room rectangle a door/window sits on. */
export type Wall = "top" | "right" | "bottom" | "left";

/** A rectangle corner (screen: tl=top-left … br=bottom-right). */
export type Corner = "tl" | "tr" | "br" | "bl";

/** A point in plot-relative units. */
export interface Pt {
  x: number;
  y: number;
}

/** A door or window attached to a room wall. */
export interface Fixture {
  id: string;
  kind: "door" | "window";
  wall: Wall;
  /** Position along the wall, 0..1 (0 = start corner, 1 = end corner). */
  t: number;
}

/** A single room block on the plan. Coordinates are plot-relative units. */
export interface Room {
  id: string;
  /** Matches a ROOM_TYPES id (e.g. "kitchen") and a VASTU_RULES room key. */
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fixtures: Fixture[];
}

/** The whole floor plan / save payload. */
export interface Plan {
  /**
   * The house outline as a polygon of >= 3 vertices (plot-relative units). The
   * user can add/drag/remove corners, so the plot can be any N-sided shape.
   */
  plot: Pt[];
  /**
   * Real-world compass bearing (degrees clockwise from north) that the plan's
   * screen-up currently points to. 0 = screen-up is true north. Set by the
   * compass alignment or manual-rotate control; every direction computation
   * adds this so rotating the plan re-rates every room consistently.
   */
  northOffsetDeg: number;
  rooms: Room[];
}

/** Default plot + room sizing (units). */
export const PLAN_DEFAULTS = {
  /** Default plot span (square side), in units. */
  span: 12,
  roomW: 4,
  roomH: 3,
  /** Snap grid, in units, for drag/resize. */
  gridU: 0.5,
  minRoomU: 1.5,
  minSides: 3,
  maxSides: 12,
} as const;
