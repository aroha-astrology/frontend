// Deterministic "Why?" for a room's rating — no AI needed. Pure, no React.
// The UI turns this into sentences through i18n templates.

import type { Plan, Room, Zone } from "./types";
import { getRule, VASTU_RULE_SET } from "./rules";
import { rateRoom, type RoomRating } from "./analysis";

export interface RoomExplanation {
  roomId: string;
  roomType: string;
  zone: Zone;
  ratingKey: RoomRating["ratingKey"];
  score: number;
  ideal: string[];
  acceptable: string[];
  avoid: string[];
  /** The rule's traditional reasoning, English (UI prefers t(`vastu.why.reasons.${roomType}`)). */
  reason: string;
  ruleSetId: string;
  /** Entrance is judged by its door's facing, not where the room sits. */
  judgedByDoor: boolean;
}

export function explainRoom(room: Room, plan: Plan): RoomExplanation {
  const rating = rateRoom(room, plan);
  const rule = getRule(room.type);
  return {
    roomId: room.id,
    roomType: room.type,
    zone: rating.zone,
    ratingKey: rating.ratingKey,
    score: rating.score,
    ideal: rule?.idealDirections ?? [],
    acceptable: rule?.acceptableDirections ?? [],
    avoid: rule?.avoidDirections ?? [],
    reason: rule?.reason ?? "",
    ruleSetId: VASTU_RULE_SET.id,
    judgedByDoor: room.type === "entrance" && room.fixtures.some((f) => f.kind === "door"),
  };
}
