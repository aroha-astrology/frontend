// Room-type catalogue + direction metadata for the Vastu planner UI.
// Ported from the dead generation's vastu page (backend/apps/api/.../vastu/page.tsx).
// `labelKey` resolves through i18n (t(labelKey)); `label` is an English fallback.

import type { Dir8, Zone } from "./types";

export interface RoomTypeDef {
  id: string;
  /** English fallback label. */
  label: string;
  /** i18n key: t("vastu.rooms.<id>"). */
  labelKey: string;
  emoji: string;
  /** Accent colour for the block on the canvas. */
  color: string;
}

/** Room keys MUST match VASTU_RULES room keys in ./rules.ts. */
export const ROOM_TYPES: RoomTypeDef[] = [
  { id: "kitchen", label: "Kitchen", labelKey: "vastu.rooms.kitchen", emoji: "🍳", color: "#ef4444" },
  { id: "master_bed", label: "Master Bed", labelKey: "vastu.rooms.master_bed", emoji: "🛌", color: "#8b5cf6" },
  { id: "bed_2", label: "Bed 2", labelKey: "vastu.rooms.bed_2", emoji: "🛏️", color: "#a78bfa" },
  { id: "bathroom", label: "Bathroom", labelKey: "vastu.rooms.bathroom", emoji: "🚿", color: "#06b6d4" },
  { id: "puja_room", label: "Puja Room", labelKey: "vastu.rooms.puja_room", emoji: "🛕", color: "#f59e0b" },
  { id: "living", label: "Living", labelKey: "vastu.rooms.living", emoji: "🛋️", color: "#3b82f6" },
  { id: "entrance", label: "Entrance", labelKey: "vastu.rooms.entrance", emoji: "🚪", color: "#22c55e" },
  { id: "dining", label: "Dining", labelKey: "vastu.rooms.dining", emoji: "🍽️", color: "#f97316" },
  { id: "store", label: "Store", labelKey: "vastu.rooms.store", emoji: "📦", color: "#78716c" },
  { id: "kids_room", label: "Kids Room", labelKey: "vastu.rooms.kids_room", emoji: "🧒", color: "#ec4899" },
  { id: "stairs", label: "Stairs", labelKey: "vastu.rooms.stairs", emoji: "🪜", color: "#64748b" },
  { id: "balcony", label: "Balcony", labelKey: "vastu.rooms.balcony", emoji: "🌅", color: "#0ea5e9" },
  { id: "parking", label: "Parking", labelKey: "vastu.rooms.parking", emoji: "🚗", color: "#475569" },
  { id: "water_tank", label: "Water Tank", labelKey: "vastu.rooms.water_tank", emoji: "💧", color: "#0284c7" },
];

export function getRoomType(id: string): RoomTypeDef | undefined {
  return ROOM_TYPES.find((r) => r.id === id);
}

/** Element + colour per zone, used for the compass ring and zone tinting. */
export const DIRECTION_META: Record<Zone, { label: string; color: string; element: string }> = {
  N: { label: "North", color: "#3b82f6", element: "Water" },
  NE: { label: "North-East", color: "#06b6d4", element: "Water+Air" },
  E: { label: "East", color: "#f59e0b", element: "Fire" },
  SE: { label: "South-East", color: "#ef4444", element: "Fire" },
  S: { label: "South", color: "#ef4444", element: "Fire" },
  SW: { label: "South-West", color: "#8b5cf6", element: "Earth" },
  W: { label: "West", color: "#64748b", element: "Air" },
  NW: { label: "North-West", color: "#64748b", element: "Air" },
  C: { label: "Brahmasthan", color: "#D4AF37", element: "Space" },
};

/** Clockwise from North — the order shown around the compass ring. */
export const DIR8_CW: Dir8[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

/**
 * Maps the rules-engine status to a UI rating: an i18n label key, a Tailwind
 * tone class group, and a hex for SVG strokes. Screen labels come from
 * t(labelKey).
 */
export type RatingTone = "good" | "ok" | "warn" | "bad" | "neutral";

export const RATING_META: Record<
  "ideal" | "acceptable" | "poor" | "harmful" | "center",
  { tone: RatingTone; labelKey: string; hex: string }
> = {
  ideal: { tone: "good", labelKey: "vastu.rating.ideal", hex: "#22c55e" },
  acceptable: { tone: "ok", labelKey: "vastu.rating.acceptable", hex: "#84cc16" },
  poor: { tone: "warn", labelKey: "vastu.rating.poor", hex: "#f59e0b" },
  harmful: { tone: "bad", labelKey: "vastu.rating.harmful", hex: "#ef4444" },
  center: { tone: "neutral", labelKey: "vastu.rating.center", hex: "#D4AF37" },
};

/** Tailwind classes per tone (text + subtle bg + border), theme-aware. */
export const TONE_CLASSES: Record<RatingTone, { text: string; chip: string; dot: string }> = {
  good: { text: "text-emerald-400", chip: "border-emerald-500/25 bg-emerald-500/10", dot: "bg-emerald-400" },
  ok: { text: "text-lime-400", chip: "border-lime-500/25 bg-lime-500/10", dot: "bg-lime-400" },
  warn: { text: "text-amber-400", chip: "border-amber-500/25 bg-amber-500/10", dot: "bg-amber-400" },
  bad: { text: "text-red-400", chip: "border-red-500/25 bg-red-500/10", dot: "bg-red-400" },
  neutral: { text: "text-gold", chip: "border-gold/25 bg-gold/10", dot: "bg-gold" },
};
