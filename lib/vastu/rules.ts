// Deterministic Vastu rules engine — pure, offline, no deps.
// Ported verbatim from backend/apps/api/src/app/api/vastu/analyze/route.ts
// (VASTU_RULES + evaluateRoomPlacement). Powers the LIVE, instant rating in the
// browser. Keep in sync with the backend copy backend/src/modules/vastu/vastu.rules.ts.

export interface VastuRule {
  room: string;
  idealDirections: string[];
  acceptableDirections: string[];
  avoidDirections: string[];
  weight: number;
  reason: string;
}

export const VASTU_RULES: VastuRule[] = [
  {
    room: "kitchen",
    idealDirections: ["SE"],
    acceptableDirections: ["NW", "E"],
    avoidDirections: ["NE", "SW", "N"],
    weight: 9,
    reason: "Agni (fire) element resides in SE. Kitchen here promotes health and prosperity.",
  },
  {
    room: "master_bed",
    idealDirections: ["SW"],
    acceptableDirections: ["S", "W"],
    avoidDirections: ["NE", "SE", "N"],
    weight: 9,
    reason: "SW provides stability, grounding, and authority to the head of household.",
  },
  {
    room: "bed_2",
    idealDirections: ["NW", "W"],
    acceptableDirections: ["S", "N"],
    avoidDirections: ["NE", "SE"],
    weight: 6,
    reason:
      "Secondary bedrooms in NW/W support restful sleep without competing with the master bedroom energy in SW.",
  },
  {
    room: "puja_room",
    idealDirections: ["NE"],
    acceptableDirections: ["E", "N"],
    avoidDirections: ["S", "SW", "SE"],
    weight: 10,
    reason: "NE (Ishaan) is the direction of divine energy and spiritual upliftment.",
  },
  {
    room: "living",
    idealDirections: ["N", "NE"],
    acceptableDirections: ["E", "NW"],
    avoidDirections: ["SW", "SE"],
    weight: 7,
    reason: "North and NE attract positive energy, wealth, and social harmony.",
  },
  {
    room: "entrance",
    idealDirections: ["N", "NE", "E"],
    acceptableDirections: ["NW"],
    avoidDirections: ["S", "SW", "SE", "W"],
    weight: 10,
    reason: "Entrance in N/NE/E allows maximum positive prana to enter the house.",
  },
  {
    room: "bathroom",
    idealDirections: ["NW"],
    acceptableDirections: ["W", "N"],
    avoidDirections: ["NE", "E", "SE", "SW"],
    weight: 7,
    reason: "NW (Vayu) helps drain negative energy. Bathroom in NE destroys positive energy.",
  },
  {
    room: "store",
    idealDirections: ["SW"],
    acceptableDirections: ["S", "W", "NW"],
    avoidDirections: ["NE", "E"],
    weight: 5,
    reason: "SW is ideal for storage as it represents earth element and stability.",
  },
  {
    room: "kids_room",
    idealDirections: ["W", "NW"],
    acceptableDirections: ["N", "E"],
    avoidDirections: ["SW", "SE"],
    weight: 7,
    reason: "West and NW promote creativity and growth for children.",
  },
  {
    room: "dining",
    idealDirections: ["W", "E"],
    acceptableDirections: ["N", "NW"],
    avoidDirections: ["S", "SE"],
    weight: 6,
    reason: "West and East promote healthy digestion and family bonding during meals.",
  },
  {
    room: "parking",
    idealDirections: ["NW", "SE"],
    acceptableDirections: ["W", "S"],
    avoidDirections: ["NE", "E"],
    weight: 4,
    reason: "NW (Vayu/movement) is ideal for vehicles. NE parking blocks the most sacred energy zone.",
  },
  {
    room: "stairs",
    idealDirections: ["S", "SW", "W"],
    acceptableDirections: ["SE"],
    avoidDirections: ["NE", "N", "E"],
    weight: 6,
    reason:
      "Stairs in SW/S keep grounding stable. NE stairs cut through the most sacred zone and drain household energy.",
  },
  {
    room: "balcony",
    idealDirections: ["N", "NE", "E"],
    acceptableDirections: ["NW"],
    avoidDirections: ["SW", "S"],
    weight: 4,
    reason: "Open spaces in N/NE/E let morning light and prana flow through the home.",
  },
  {
    room: "water_tank",
    idealDirections: ["NE", "N"],
    acceptableDirections: ["E", "NW"],
    avoidDirections: ["SE", "S", "SW"],
    weight: 6,
    reason:
      "Water in NE supports prosperity and health. Water in SE clashes with the fire element and causes friction.",
  },
];

export type RoomStatus = "ideal" | "acceptable" | "poor" | "harmful";

export interface RoomScore {
  room: string;
  currentDirection: string;
  idealDirections: string[];
  score: number;
  status: RoomStatus;
  suggestion: string;
  reason: string;
}

/**
 * Scores a room→direction(s) layout. `roomLayout` maps a room key to the
 * direction(s) it currently occupies. Returns per-placement scores plus a
 * weighted overall score (0–100).
 */
export function evaluateRoomPlacement(roomLayout: Record<string, string[]>): {
  roomScores: RoomScore[];
  overallScore: number;
} {
  const roomScores: RoomScore[] = [];
  let totalWeight = 0;
  let totalWeightedScore = 0;

  for (const rule of VASTU_RULES) {
    const directions = roomLayout[rule.room];
    if (!directions || directions.length === 0) continue;

    for (const direction of directions) {
      const upperDir = direction.toUpperCase();
      let score: number;
      let status: RoomStatus;
      let suggestion: string;

      if (rule.idealDirections.includes(upperDir)) {
        score = 100;
        status = "ideal";
        suggestion = `Excellent placement! ${rule.room} in ${upperDir} is perfectly aligned with Vastu principles.`;
      } else if (rule.acceptableDirections.includes(upperDir)) {
        score = 65;
        status = "acceptable";
        suggestion = `Acceptable placement. Ideally, ${rule.room} should be in ${rule.idealDirections.join(" or ")}.`;
      } else if (rule.avoidDirections.includes(upperDir)) {
        score = 15;
        status = "harmful";
        suggestion = `Vastu defect! ${rule.room} in ${upperDir} is harmful. Move to ${rule.idealDirections.join(
          " or ",
        )} if possible. Apply remedies if not.`;
      } else {
        score = 45;
        status = "poor";
        suggestion = `Not ideal. ${rule.room} should ideally be in ${rule.idealDirections.join(" or ")}.`;
      }

      roomScores.push({
        room: rule.room,
        currentDirection: upperDir,
        idealDirections: rule.idealDirections,
        score,
        status,
        suggestion,
        reason: rule.reason,
      });

      totalWeight += rule.weight;
      totalWeightedScore += score * rule.weight;
    }
  }

  const overallScore = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 50;
  return { roomScores, overallScore };
}

export function getRule(roomType: string): VastuRule | undefined {
  return VASTU_RULES.find((r) => r.room === roomType);
}

/** Classify a single room→direction placement (same bands as the engine). */
export function classifyPlacement(
  roomType: string,
  direction: string,
): { status: RoomStatus; score: number } | null {
  const rule = getRule(roomType);
  if (!rule) return null;
  const dir = direction.toUpperCase();
  if (rule.idealDirections.includes(dir)) return { status: "ideal", score: 100 };
  if (rule.acceptableDirections.includes(dir)) return { status: "acceptable", score: 65 };
  if (rule.avoidDirections.includes(dir)) return { status: "harmful", score: 15 };
  return { status: "poor", score: 45 };
}
