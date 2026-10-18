/**
 * The cards on Home, and how the owner's layout (Admin → Home Layout) arranges them.
 *
 * `HOME_CARDS` is the one list of cards: Home renders from it and the admin page edits an order of
 * its ids. A card shows only when its admin switch is on AND the layout allows it, so a layout can
 * never turn on a card that is switched off.
 */

export interface HomeCardMeta {
  id: string;
  /** The admin switch that decides whether the card exists at all. */
  featureKey: string;
  /** Plain name for the admin page. */
  label: string;
  /** A ship-dark roadmap card: a key missing from /v1/me hides it instead of showing it. */
  isNew?: true;
  /** Takes the full page width on its own row (the sliders) instead of joining a row of cards. */
  wide?: true;
}

/** Order here is the built-in order, used when no layout is set. */
export const HOME_CARDS: readonly HomeCardMeta[] = [
  { id: "todayReading", featureKey: "home.todayReading", label: "Today's reading" },
  { id: "astroWeather", featureKey: "home.astroWeather", label: "Astro weather", isNew: true },
  { id: "journalPrompt", featureKey: "home.journalPrompt", label: "Journal prompt", isNew: true },
  { id: "kundliCard", featureKey: "home.kundliCard", label: "Kundli" },
  { id: "bonds", featureKey: "home.bondsCard", label: "Aroha Bonds", isNew: true },
  { id: "horoscopeSlider", featureKey: "home.horoscopeSlider", label: "Moon sign horoscope", wide: true },
  { id: "reportsSlider", featureKey: "home.reportsSection", label: "Reports", wide: true },
  { id: "matchmaking", featureKey: "home.matchmaking", label: "Match making" },
  { id: "vastuCard", featureKey: "home.vastuCard", label: "Vastu" },
  { id: "palmReading", featureKey: "home.palmReading", label: "Palm reading" },
  { id: "shlokas", featureKey: "home.shlokas", label: "Shlokas" },
  { id: "remedies", featureKey: "home.remedies", label: "Remedies" },
];

export const SLOT_NAMES = ["morning", "midday", "evening", "night"] as const;
export type SlotName = (typeof SLOT_NAMES)[number];

export const SLOT_LABELS: Record<SlotName, string> = {
  morning: "Morning",
  midday: "Midday",
  evening: "Evening",
  night: "Night",
};

export type LookName = "vedic" | "cosmic";

export interface LookLayout {
  order: string[];
  heroBySlot: Record<SlotName, string | null>;
}

export interface HomeLayoutDoc {
  vedic: LookLayout;
  cosmic: LookLayout;
  slots: Record<SlotName, string>;
}

export interface StoredHomeLayout {
  draft: HomeLayoutDoc | null;
  published: HomeLayoutDoc | null;
  previous: HomeLayoutDoc | null;
}

export const DEFAULT_SLOTS: Record<SlotName, string> = {
  morning: "05:00",
  midday: "11:30",
  evening: "18:00",
  night: "20:30",
};

/** A layout that changes nothing: every card in its built-in place, no hero. */
export function defaultHomeLayout(): HomeLayoutDoc {
  const look = (): LookLayout => ({
    order: HOME_CARDS.map((c) => c.id),
    heroBySlot: { morning: null, midday: null, evening: null, night: null },
  });
  return { vedic: look(), cosmic: look(), slots: { ...DEFAULT_SLOTS } };
}

/** "HH:MM" to minutes since midnight. */
function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Which part of the day it is. Before the morning start it is still night. */
export function slotAt(now: Date, slots: Record<SlotName, string>): SlotName {
  const t = now.getHours() * 60 + now.getMinutes();
  if (t >= minutesOf(slots.night)) return "night";
  if (t >= minutesOf(slots.evening)) return "evening";
  if (t >= minutesOf(slots.midday)) return "midday";
  if (t >= minutesOf(slots.morning)) return "morning";
  return "night";
}

/**
 * Put `items` (each with an `id`) in the layout's order for a look and time of day.
 *
 * - Ids in the order that are not among `items` are ignored (a card removed in code, or switched off).
 * - Items the layout does not mention keep their built-in relative order and go to the end, so a new
 *   card nobody has placed yet never vanishes.
 * - The hero for the current time slot is moved to the top, if it is among `items`.
 */
export function arrangeCards<T extends { id: string }>(
  items: readonly T[],
  layout: HomeLayoutDoc | null,
  look: LookName,
  now: Date,
): T[] {
  if (!layout) return [...items];
  const lookLayout = layout[look];
  const byId = new Map(items.map((i) => [i.id, i]));
  const placed: T[] = [];
  const seen = new Set<string>();
  for (const id of lookLayout.order) {
    const item = byId.get(id);
    if (item && !seen.has(id)) {
      placed.push(item);
      seen.add(id);
    }
  }
  const rest = items.filter((i) => !seen.has(i.id));
  const ordered = [...placed, ...rest];

  const hero = lookLayout.heroBySlot[slotAt(now, layout.slots)];
  if (!hero) return ordered;
  const at = ordered.findIndex((i) => i.id === hero);
  if (at <= 0) return ordered;
  const [heroItem] = ordered.splice(at, 1);
  return [heroItem!, ...ordered];
}

/** Move a card one place up (-1) or down (+1) in an order. Returns the same array at either end. */
export function moveCard(order: readonly string[], id: string, by: -1 | 1): string[] {
  const from = order.indexOf(id);
  const to = from + by;
  if (from < 0 || to < 0 || to >= order.length) return [...order];
  const next = [...order];
  [next[from], next[to]] = [next[to]!, next[from]!];
  return next;
}

/** Move a card to the place another card holds (drag and drop). */
export function dropCard(order: readonly string[], id: string, onto: string): string[] {
  const from = order.indexOf(id);
  const to = order.indexOf(onto);
  if (from < 0 || to < 0 || from === to) return [...order];
  const next = [...order];
  next.splice(from, 1);
  next.splice(to, 0, id);
  return next;
}

/**
 * The editable order for the admin page: the stored order with unknown ids dropped and any card the
 * order does not list appended, so every card can be seen and placed.
 */
export function completeOrder(order: readonly string[]): string[] {
  const known = new Set(HOME_CARDS.map((c) => c.id));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of order) {
    if (known.has(id) && !seen.has(id)) {
      out.push(id);
      seen.add(id);
    }
  }
  for (const c of HOME_CARDS) if (!seen.has(c.id)) out.push(c.id);
  return out;
}
