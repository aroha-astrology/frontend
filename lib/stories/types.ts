/**
 * Daily Stories: the story ring on the Home avatar (flag `home.dailyStories`).
 * Four stories a day, the same for every profile, built from data the app
 * already has (today's panchang, the Gita verse list, the mantra library).
 */
export type StoryId = "panchang" | "hora" | "deity" | "gita";

/** Order here IS the order the viewer plays them in. */
export const STORY_IDS: readonly StoryId[] = ["panchang", "hora", "deity", "gita"];

/** The seven hora rulers, spelled as the backend's panchang engine sends them. */
export const HORA_PLANETS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"] as const;
export type HoraPlanet = (typeof HORA_PLANETS)[number];

/** Where a story can be shared to. `copy` and `system` need no target app. */
export type ShareTarget =
  | "whatsappStatus"
  | "whatsapp"
  | "instagramStory"
  | "instagram"
  | "x"
  | "sms"
  | "copy"
  | "system";
