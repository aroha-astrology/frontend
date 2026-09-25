// Plan validity for the Vastu planner. Pure, no React.
//
// Two severities, per the Studio spec: a room outside the home outline (or a
// self-crossing outline) is INVALID — it has no meaningful direction and blocks
// a paid report. Overlapping rooms are a soft WARNING — shown, never blocking.

import type { Plan } from "./types";
import { polygonSelfIntersects, roomInsidePlot, roomsOverlap } from "./geometry";

export type RoomIssue = "outside" | "overlap";

export interface PlanValidation {
  /** The plot outline crosses itself. */
  plotInvalid: boolean;
  /** roomId → its issues (absent = fine). */
  roomIssues: Record<string, RoomIssue[]>;
  /** Rooms fully inside the outline. */
  validRoomCount: number;
  outsideCount: number;
  overlapCount: number;
  /** Nothing blocks a paid report: a sound outline, >= 1 room, and no room outside it. */
  reportReady: boolean;
}

export function validatePlan(plan: Plan): PlanValidation {
  const plotInvalid = plan.plot.length < 3 || polygonSelfIntersects(plan.plot);
  const roomIssues: Record<string, RoomIssue[]> = {};
  const add = (id: string, issue: RoomIssue) => {
    const list = (roomIssues[id] ??= []);
    if (!list.includes(issue)) list.push(issue);
  };

  let outsideCount = 0;
  for (const room of plan.rooms) {
    if (plotInvalid || !roomInsidePlot(room, plan.plot)) {
      add(room.id, "outside");
      outsideCount++;
    }
  }

  const overlapping = new Set<string>();
  for (let i = 0; i < plan.rooms.length; i++) {
    for (let j = i + 1; j < plan.rooms.length; j++) {
      const a = plan.rooms[i];
      const b = plan.rooms[j];
      if (roomsOverlap(a, b)) {
        add(a.id, "overlap");
        add(b.id, "overlap");
        overlapping.add(a.id);
        overlapping.add(b.id);
      }
    }
  }

  const validRoomCount = plan.rooms.length - outsideCount;
  return {
    plotInvalid,
    roomIssues,
    validRoomCount,
    outsideCount,
    overlapCount: overlapping.size,
    reportReady: !plotInvalid && plan.rooms.length > 0 && outsideCount === 0,
  };
}
