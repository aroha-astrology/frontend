import type { HoraPlanet } from "./types";

export type DeityId = "surya" | "shiva" | "hanuman" | "ganesha" | "vishnu" | "lakshmi" | "shani";

export interface WeekdayDeity {
  /** Key under `stories.deity.list` in the translations. */
  id: DeityId;
  /** The planet that rules this weekday. */
  planet: HoraPlanet;
  /** Slug of the mantra in public/shlokas/shlokas.json. */
  slug: string;
  /** File name under public/shlokas/img/. */
  img: string;
}

// Same mantra slugs as the backend's WEEKDAY_SHLOKA (modules/practice/practice.service.ts), so the story and Today's Practice agree.
/** Index 0 is Sunday, 6 is Saturday (same as Date.getDay()). */
export const WEEKDAY_DEITIES: readonly WeekdayDeity[] = [
  { id: "surya", planet: "Sun", slug: "aditya-hrudayam", img: "aditya.webp" },
  { id: "shiva", planet: "Moon", slug: "shiva-dhyana", img: "shiva-dhyana.webp" },
  { id: "hanuman", planet: "Mars", slug: "hanuman-dhyana", img: "hanuman.webp" },
  { id: "ganesha", planet: "Mercury", slug: "ganesh-vandana", img: "ganesha.webp" },
  { id: "vishnu", planet: "Jupiter", slug: "vishnu-shantakaram", img: "vishnu-shesha.webp" },
  { id: "lakshmi", planet: "Venus", slug: "lakshmi-mantra", img: "lakshmi.webp" },
  { id: "shani", planet: "Saturn", slug: "hanuman-gayatri", img: "hanuman.webp" },
];

/** The deity of `date`'s weekday (device local time). */
export function deityForDate(date: Date): WeekdayDeity {
  return WEEKDAY_DEITIES[date.getDay()]!;
}
