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
  /** Plot width in units. */
  widthU: number;
  /** Plot height in units. */
  heightU: number;
  /**
   * Real-world compass bearing (degrees clockwise from north) that the plan's
   * screen-up currently points to. 0 = screen-up is true north. Set by the
   * compass lock or the manual-rotate control; every direction computation
   * adds this so rotating the plan re-rates every room consistently.
   */
  northOffsetDeg: number;
  rooms: Room[];
}

/** Default plot + room sizing (units). */
export const PLAN_DEFAULTS = {
  widthU: 12,
  heightU: 12,
  roomW: 4,
  roomH: 3,
  /** Snap grid, in units, for drag/resize. */
  gridU: 0.5,
  minRoomU: 1.5,
} as const;
