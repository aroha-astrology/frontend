// What stands behind the score, for the tappable score card. Pure, no React.
//
// Only room placement feeds the number (weighted by the rule set). The other
// rows are plain indicators, labelled as such — the score must never look like
// more than it is.

import type { Plan } from "./types";
import type { PlanAnalysis, RoomRating } from "./analysis";
import { bbox } from "./geometry";

export type Signal = "good" | "ok" | "check" | "none";

export interface ScoreBreakdown {
  aligned: number;
  acceptable: number;
  average: number;
  correction: number;
  onCentre: number;
  /** Rooms in rating order worst-first — the issue list. */
  issues: RoomRating[];
  entrance: Signal;
  centre: Signal;
  plotShape: Signal;
  plotSides: number;
}

export function scoreBreakdown(plan: Plan, analysis: PlanAnalysis): ScoreBreakdown {
  const count = (k: RoomRating["ratingKey"]) => analysis.rooms.filter((r) => r.ratingKey === k).length;
  const order: Record<RoomRating["ratingKey"], number> = { harmful: 0, center: 1, poor: 2, acceptable: 3, ideal: 4 };
  const issues = analysis.rooms
    .filter((r) => r.ratingKey !== "ideal")
    .sort((a, b) => order[a.ratingKey] - order[b.ratingKey] || a.score - b.score);

  const ent = analysis.rooms.find((r) => r.roomType === "entrance");
  const entrance: Signal = !ent ? "none" : ent.ratingKey === "ideal" ? "good" : ent.ratingKey === "acceptable" ? "ok" : "check";

  const onCentre = count("center");
  const n = plan.plot.length;
  let plotShape: Signal = "check";
  if (n === 4) {
    const bb = bbox(plan.plot);
    const area = Math.abs(plan.plot.reduce((s, p, i) => {
      const q = plan.plot[(i + 1) % n];
      return s + (p.x * q.y - q.x * p.y);
    }, 0)) / 2;
    // A true rectangle fills its bounding box.
    plotShape = bb.w * bb.h > 0 && area / (bb.w * bb.h) > 0.98 ? "good" : "check";
  }

  return {
    aligned: count("ideal"),
    acceptable: count("acceptable"),
    average: count("poor"),
    correction: count("harmful"),
    onCentre,
    issues,
    entrance,
    centre: onCentre ? "check" : "good",
    plotShape,
    plotSides: n,
  };
}
