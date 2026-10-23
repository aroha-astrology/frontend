/**
 * The Morning Ritual (switch ritual.morning): a daily Prashna card, 11 japs or 3 breaths, a mood
 * check. The server picks the card and keeps the merged streak; this file is the shapes and the
 * parts of the screen that need no server.
 */

export type RitualPractice = "jap" | "breath";

export interface RitualToday {
  localDate: string;
  timeZone: string;
  completed: boolean;
  cardIndex: number;
  basis: "moonAndLagna" | "moon";
  practice: RitualPractice | null;
  mood: number | null;
  streak: {
    run: number;
    shields: number;
    cosmicKeys: number;
    nextKeyInDays: number;
    nextShieldInDays: number;
  };
}

export interface RitualResult extends RitualToday {
  alreadyDone: boolean;
  earned: { key: boolean; shield: boolean; shieldCoveredDate: string | null };
  rewardPaise: number;
}

/** 27 nakshatras x 4 padas. */
export const PRASHNA_CARDS = 108;

/** The key each nakshatra is filed under in `nakshatraNames`, in zodiac order. */
export const NAKSHATRA_KEYS = [
  "ashwini", "bharani", "krittika", "rohini", "mrigashira", "ardra", "punarvasu", "pushya", "ashlesha",
  "magha", "purvaphalguni", "uttaraphalguni", "hasta", "chitra", "swati", "vishakha", "anuradha",
  "jyeshtha", "moola", "purvaashadha", "uttaraashadha", "shravana", "dhanishta", "shatabhisha",
  "purvabhadrapada", "uttarabhadrapada", "revati",
] as const;

/** The four aims a pada stands for, in order. */
export const LENS_KEYS = ["dharma", "artha", "kama", "moksha"] as const;
export type LensKey = (typeof LENS_KEYS)[number];

export interface PrashnaRef {
  index: number;
  /** 0-26 */
  nakshatra: number;
  nakshatraKey: (typeof NAKSHATRA_KEYS)[number];
  /** 1-4 */
  pada: number;
  lens: LensKey;
}

/** Where a card (0-107) sits: its nakshatra, pada and the aim that pada stands for. */
export function prashnaRef(index: number): PrashnaRef {
  const i = ((Math.trunc(index) % PRASHNA_CARDS) + PRASHNA_CARDS) % PRASHNA_CARDS;
  const nakshatra = Math.floor(i / 4);
  const padaIndex = i % 4;
  return {
    index: i,
    nakshatra,
    nakshatraKey: NAKSHATRA_KEYS[nakshatra]!,
    pada: padaIndex + 1,
    lens: LENS_KEYS[padaIndex]!,
  };
}

/** Japs in one sitting, and breaths. */
export const JAP_COUNT = 11;
export const BREATH_COUNT = 3;
/** How long the seal is held to begin, in milliseconds. */
export const SEAL_HOLD_MS = 1500;
/** One breath: in, then out. */
export const BREATH_IN_MS = 4000;
export const BREATH_OUT_MS = 4000;

export const MOODS = [1, 2, 3, 4, 5] as const;

/** A short haptic pattern, in milliseconds, for each moment of the ritual. */
export const HAPTIC = {
  sealStart: 10,
  sealDone: 40,
  jap: 15,
  breath: 25,
  finish: [30, 60, 30],
} as const;

export type Look = "vedic" | "cosmic";

/** The i18n keys that make up one card's text: the theme, the aim's label, and the aim's question. */
export function prashnaKeys(look: Look, ref: PrashnaRef): { theme: string; lensLabel: string; question: string } {
  return {
    theme: `prashna.${look}.theme.${ref.nakshatraKey}`,
    lensLabel: `prashna.${look}.lens.${ref.lens}.label`,
    question: `prashna.${look}.lens.${ref.lens}.q`,
  };
}
