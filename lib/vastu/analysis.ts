// Bridges pure geometry + rules into UI-ready ratings for a whole plan.
// Used by AnalysisPanel (the list) and RoomBlock (its coloured border).

import type { Plan, Room, Zone } from "./types";
import { RATING_META, getRoomType, type RatingTone } from "./data";
import { classifyPlacement, evaluateRoomPlacement, getRule } from "./rules";
import { roomDirection, fixtureFacing, buildRoomLayout } from "./geometry";

export interface RoomRating {
  roomId: string;
  roomType: string;
  /** English fallback label (UI prefers t(labelKey)). */
  label: string;
  labelKey: string;
  emoji: string;
  zone: Zone;
  /** RATING_META key. */
  ratingKey: "ideal" | "acceptable" | "poor" | "harmful" | "center";
  tone: RatingTone;
  hex: string;
  score: number;
  idealDirections: string[];
  reason: string;
}

/** The zone a room is judged on: entrance uses its main door's facing. */
export function ratedZone(room: Room, plan: Plan): Zone {
  if (room.type === "entrance") {
    const door = room.fixtures.find((f) => f.kind === "door");
    if (door) return fixtureFacing(door.wall, plan);
  }
  return roomDirection(room, plan);
}

export function rateRoom(room: Room, plan: Plan): RoomRating {
  const type = getRoomType(room.type);
  const rule = getRule(room.type);
  const zone = ratedZone(room, plan);

  let ratingKey: RoomRating["ratingKey"];
  let score: number;
  if (zone === "C") {
    ratingKey = "center";
    score = 50;
  } else {
    const c = classifyPlacement(room.type, zone);
    ratingKey = c ? c.status : "poor";
    score = c ? c.score : 45;
  }

  const meta = RATING_META[ratingKey];
  return {
    roomId: room.id,
    roomType: room.type,
    label: type?.label ?? room.type,
    labelKey: type?.labelKey ?? room.type,
    emoji: type?.emoji ?? "🏠",
    zone,
    ratingKey,
    tone: meta.tone,
    hex: meta.hex,
    score,
    idealDirections: rule?.idealDirections ?? [],
    reason: rule?.reason ?? "",
  };
}

export interface PlanAnalysis {
  rooms: RoomRating[];
  overallScore: number;
}

export function analyzePlan(plan: Plan): PlanAnalysis {
  const rooms = plan.rooms.map((r) => rateRoom(r, plan));
  // Reuse the engine's weighted overall for parity with the backend.
  const { overallScore } = evaluateRoomPlacement(buildRoomLayout(plan));
  return { rooms, overallScore };
}
