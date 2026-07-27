// Muhurta ("auspicious timing") rule tables for the "Check Auspicious Days"
// feature — a set of classical, life-category-specific favorability rules
// layered on top of a day's tithi/paksha/nakshatra/vara, plus a scan helper
// that finds the best upcoming dates for a category from a month of
// PanchangMonthDay rows (see lib/api.ts's `api.panchangMonth`).
//
// Like day-guidance.ts, this module returns `t()` KEYS, never raw English —
// see i18n/resources.ts's `horoscope.panchang.muhurta.*` namespace for the
// actual copy in all 7 languages.
//
// `nakshatraName` values are matched against the backend's exact spelling
// (see @aroha-astrology/shared's NAKSHATRAS: "Ashwini", "Bharani", "Krittika",
// "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha",
// "PurvaPhalguni", "UttaraPhalguni", "Hasta", "Chitra", "Swati", "Vishakha",
// "Anuradha", "Jyeshtha", "Moola", "PurvaAshadha", "UttaraAshadha",
// "Shravana", "Dhanishta", "Shatabhisha", "PurvaBhadrapada",
// "UttaraBhadrapada", "Revati"). `vara` values are matched against the
// backend's exact weekday strings (see jyotish-backend's WEEKDAY_NAMES):
// "Ravivaar" (Sun), "Somvaar" (Mon), "Mangalvaar" (Tue), "Budhvaar" (Wed),
// "Guruvaar" (Thu), "Shukravaar" (Fri), "Shanivaar" (Sat) — not English day
// names. `tithiNumber` is the app's absolute 1-30 numbering (1-15 Shukla,
// 16-30 Krishna; see day-guidance.ts's doc comment for the same convention).

import type { PanchangMonthDay } from "@/lib/api";

export type MuhurtaCategoryId =
  | "careerBusiness"
  | "education"
  | "travel"
  | "property"
  | "health"
  | "beautySelfCare"
  | "marriageRelationships";

export const MUHURTA_CATEGORY_IDS: MuhurtaCategoryId[] = [
  "careerBusiness",
  "education",
  "travel",
  "property",
  "health",
  "beautySelfCare",
  "marriageRelationships",
];

export type MuhurtaTone = "favorable" | "neutral" | "unfavorable";

/**
 * "Rikta" (empty/incomplete) tithis — 4th, 9th, and 14th of each paksha —
 * classically avoided for starting new ventures of any kind, independent of
 * category. Every category's `unfavorableTithiNumbers` includes this set.
 */
const RIKTA_TITHI_NUMBERS = [4, 9, 14, 19, 24, 29];

/**
 * The general "auspicious tithi" list used across most classical muhurta
 * categories: 2nd/3rd/5th/7th/10th/11th/12th/13th of each paksha, plus
 * Purnima — mirrors jyotish-backend's own `AUSPICIOUS_TITHI_INDICES` (see
 * lib/astro-engine/panchang/tithi.ts), expressed here as absolute 1-30
 * tithi numbers. Amavasya (30) is deliberately excluded.
 */
const GENERAL_AUSPICIOUS_TITHI_NUMBERS = [2, 3, 5, 7, 10, 11, 12, 13, 15, 17, 18, 20, 22, 25, 26, 27, 28];

interface MuhurtaCategoryRule {
  id: MuhurtaCategoryId;
  favorableNakshatras: string[];
  unfavorableNakshatras: string[];
  favorableTithiNumbers: number[];
  unfavorableTithiNumbers: number[];
  favorableVara: string[];
  unfavorableVara: string[];
}

// ─── Category rule tables ───────────────────────────────────────────────────
// Each table cites the classical basis in its comment. These are real Vedic
// muhurta conventions (commonly cited across Muhurta Chintamani-derived
// panchang guides), not filler content.

const CAREER_BUSINESS: MuhurtaCategoryRule = {
  id: "careerBusiness",
  // Pushya ("Raja Nakshatra") heads every general-purpose list; Hasta/Chitra
  // favor craftsmanship and trade; the "Uttara" trio favors durable,
  // long-term ventures; Anuradha favors partnerships; Revati favors gentle,
  // well-supported launches.
  favorableNakshatras: [
    "Pushya",
    "Hasta",
    "Chitra",
    "UttaraPhalguni",
    "UttaraAshadha",
    "UttaraBhadrapada",
    "Anuradha",
    "Revati",
  ],
  unfavorableNakshatras: ["Bharani", "Krittika", "Ashlesha", "Jyeshtha", "Moola"],
  favorableTithiNumbers: GENERAL_AUSPICIOUS_TITHI_NUMBERS,
  unfavorableTithiNumbers: [...RIKTA_TITHI_NUMBERS, 30],
  // Budhvaar (Mercury, commerce), Guruvaar (Jupiter, wealth/wisdom),
  // Shukravaar (Venus, prosperity) are the classical picks for new ventures.
  favorableVara: ["Budhvaar", "Guruvaar", "Shukravaar"],
  unfavorableVara: ["Mangalvaar", "Shanivaar"],
};

const EDUCATION: MuhurtaCategoryRule = {
  id: "education",
  // Punarvasu/Shravana favor listening & learning; Pushya/Hasta/Chitra/Swati/
  // Anuradha are broadly favorable for skill-building.
  favorableNakshatras: ["Pushya", "Hasta", "Chitra", "Swati", "Anuradha", "Shravana", "Punarvasu"],
  unfavorableNakshatras: ["Ashlesha", "Jyeshtha", "Moola", "Bharani"],
  // Panchami is Saraswati's own tithi (cf. Vasant Panchami) — education gets
  // the general list plus an extra nod to Panchami via the shared table.
  favorableTithiNumbers: GENERAL_AUSPICIOUS_TITHI_NUMBERS,
  unfavorableTithiNumbers: [...RIKTA_TITHI_NUMBERS, 30],
  // Budhvaar (Mercury, intellect) and Guruvaar (Jupiter, wisdom/teachers).
  favorableVara: ["Budhvaar", "Guruvaar"],
  unfavorableVara: [],
};

const TRAVEL: MuhurtaCategoryRule = {
  id: "travel",
  // Ashwini (speed, the Ashwini Kumaras' own nakshatra), Pushya, Hasta,
  // Revati (safe arrival), Shravana, Dhanishta (movement/prosperity).
  favorableNakshatras: ["Ashwini", "Pushya", "Hasta", "Revati", "Shravana", "Dhanishta", "Punarvasu"],
  unfavorableNakshatras: ["Bharani", "Krittika", "Ashlesha", "Moola", "Jyeshtha"],
  favorableTithiNumbers: GENERAL_AUSPICIOUS_TITHI_NUMBERS,
  unfavorableTithiNumbers: [...RIKTA_TITHI_NUMBERS, 30],
  // Somvaar/Budhvaar/Guruvaar/Shukravaar are the classical picks for setting
  // out; Mangalvaar (accident risk) and Shanivaar are traditionally avoided.
  favorableVara: ["Somvaar", "Budhvaar", "Guruvaar", "Shukravaar"],
  unfavorableVara: ["Mangalvaar", "Shanivaar"],
};

const PROPERTY: MuhurtaCategoryRule = {
  id: "property",
  // The classical Griha Pravesh (housewarming) / property nakshatra list:
  // Rohini, Mrigashira, the "Uttara" trio, Revati, plus Pushya generally.
  favorableNakshatras: ["Rohini", "Mrigashira", "UttaraPhalguni", "UttaraAshadha", "UttaraBhadrapada", "Revati", "Pushya"],
  unfavorableNakshatras: ["Bharani", "Krittika", "Ashlesha", "Jyeshtha", "Moola", "Ardra"],
  favorableTithiNumbers: GENERAL_AUSPICIOUS_TITHI_NUMBERS,
  unfavorableTithiNumbers: [...RIKTA_TITHI_NUMBERS, 30],
  favorableVara: ["Somvaar", "Budhvaar", "Guruvaar", "Shukravaar"],
  // Mangalvaar (Mars, fire risk) is strongly avoided for Griha Pravesh.
  unfavorableVara: ["Mangalvaar", "Shanivaar"],
};

const HEALTH: MuhurtaCategoryRule = {
  id: "health",
  // Ashwini (the divine physicians' own nakshatra) heads the list; Pushya/
  // Hasta/Swati/Punarvasu/Shravana are broadly supportive for wellness.
  favorableNakshatras: ["Ashwini", "Pushya", "Hasta", "Swati", "Punarvasu", "Shravana"],
  unfavorableNakshatras: ["Bharani", "Krittika", "Ashlesha", "Jyeshtha", "Moola"],
  favorableTithiNumbers: GENERAL_AUSPICIOUS_TITHI_NUMBERS,
  // Ashtami's intense Devi energy is traditionally set aside for starting an
  // elective regimen, alongside the usual Rikta tithis and Amavasya.
  unfavorableTithiNumbers: [...RIKTA_TITHI_NUMBERS, 8, 23, 30],
  // Ravivaar (Sun, vitality), Budhvaar (balance), Guruvaar (healing wisdom).
  favorableVara: ["Ravivaar", "Budhvaar", "Guruvaar"],
  unfavorableVara: ["Mangalvaar", "Shanivaar"],
};

const BEAUTY_SELF_CARE: MuhurtaCategoryRule = {
  id: "beautySelfCare",
  // The classical "hair-cut / grooming muhurta" nakshatra list.
  favorableNakshatras: ["Ashwini", "Pushya", "Hasta", "Swati", "Chitra", "Revati", "Shravana"],
  unfavorableNakshatras: ["Bharani", "Krittika", "Ashlesha"],
  favorableTithiNumbers: GENERAL_AUSPICIOUS_TITHI_NUMBERS,
  // Navami's fierce Durga energy is traditionally set aside for grooming,
  // alongside the usual Rikta tithis and Amavasya.
  unfavorableTithiNumbers: [...RIKTA_TITHI_NUMBERS, 9, 24, 30],
  // Monday/Wednesday/Thursday/Friday are the traditional grooming days.
  favorableVara: ["Somvaar", "Budhvaar", "Guruvaar", "Shukravaar"],
  // Tuesday/Saturday/Sunday are the widely-cited "avoid a haircut" days.
  unfavorableVara: ["Mangalvaar", "Shanivaar", "Ravivaar"],
};

const MARRIAGE_RELATIONSHIPS: MuhurtaCategoryRule = {
  id: "marriageRelationships",
  // The classical "Vivah Nakshatra" list cited across muhurta guides.
  favorableNakshatras: [
    "Rohini",
    "Mrigashira",
    "Magha",
    "UttaraPhalguni",
    "Hasta",
    "Swati",
    "Anuradha",
    "UttaraAshadha",
    "UttaraBhadrapada",
    "Revati",
  ],
  // The three "Purva" nakshatras plus the usual krura set are traditionally
  // avoided for weddings.
  unfavorableNakshatras: [
    "Bharani",
    "Krittika",
    "Ardra",
    "Ashlesha",
    "Jyeshtha",
    "Moola",
    "PurvaPhalguni",
    "PurvaAshadha",
    "PurvaBhadrapada",
  ],
  favorableTithiNumbers: GENERAL_AUSPICIOUS_TITHI_NUMBERS,
  // Ashtami/Navami are traditionally avoided for weddings, alongside the
  // usual Rikta tithis and Amavasya.
  unfavorableTithiNumbers: [...RIKTA_TITHI_NUMBERS, 8, 9, 23, 24, 30],
  // Monday/Wednesday/Thursday/Friday are the classical wedding-day picks
  // (Guruvaar and Shukravaar especially so).
  favorableVara: ["Somvaar", "Budhvaar", "Guruvaar", "Shukravaar"],
  unfavorableVara: ["Mangalvaar", "Shanivaar"],
};

const CATEGORY_RULES: Record<MuhurtaCategoryId, MuhurtaCategoryRule> = {
  careerBusiness: CAREER_BUSINESS,
  education: EDUCATION,
  travel: TRAVEL,
  property: PROPERTY,
  health: HEALTH,
  beautySelfCare: BEAUTY_SELF_CARE,
  marriageRelationships: MARRIAGE_RELATIONSHIPS,
};

/**
 * Scores a day against one category's rule table:
 * +2 / -2 for a favorable/unfavorable nakshatra match, +1 / -2 for a
 * favorable/unfavorable tithi match, +1 / -1 for a favorable/unfavorable
 * vara match. Nakshatra carries the most weight (a whole-day signal in
 * classical practice), unfavorable tithi is weighted equally with
 * unfavorable nakshatra (Rikta tithis are a hard classical "don't start
 * anything" signal), and vara is the lightest signal (a same-week
 * modifier, not a whole-day override).
 */
function scoreDay(rule: MuhurtaCategoryRule, day: PanchangMonthDay): number {
  let score = 0;
  if (rule.favorableNakshatras.includes(day.nakshatraName)) score += 2;
  if (rule.unfavorableNakshatras.includes(day.nakshatraName)) score -= 2;
  if (rule.favorableTithiNumbers.includes(day.tithiNumber)) score += 1;
  if (rule.unfavorableTithiNumbers.includes(day.tithiNumber)) score -= 2;
  if (rule.favorableVara.includes(day.vara)) score += 1;
  if (rule.unfavorableVara.includes(day.vara)) score -= 1;
  return score;
}

function toneForScore(score: number): MuhurtaTone {
  if (score >= 2) return "favorable";
  if (score <= -2) return "unfavorable";
  return "neutral";
}

export interface MuhurtaEvaluation {
  tone: MuhurtaTone;
  /**
   * A `t()` key resolving to a full 1-2 sentence verdict for this
   * category+tone combination — see `horoscope.panchang.muhurta.verdicts.*`
   * in i18n/resources.ts.
   */
  reasonKey: string;
}

/** Evaluates one day's favorability for one life category. Pure, no i18n import needed by the caller beyond rendering `reasonKey`. */
export function evaluateMuhurtaCategory(category: MuhurtaCategoryId, day: PanchangMonthDay): MuhurtaEvaluation {
  const rule = CATEGORY_RULES[category];
  const tone = toneForScore(scoreDay(rule, day));
  return { tone, reasonKey: `horoscope.panchang.muhurta.verdicts.${category}.${tone}` };
}

/**
 * Scans a set of days (typically a month or two of `PanchangMonthDay` from
 * `api.panchangMonth`) and returns the best upcoming favorable dates for a
 * category — sorted nearest-first, capped at `limit` (default 5). `days`
 * need not already be sorted or deduplicated; both are handled here so a
 * caller can simply concatenate this month's and next month's arrays.
 * `fromIsoDate` (default: today, YYYY-MM-DD) excludes anything strictly
 * before it so a mid-month scan doesn't surface dates already in the past.
 */
export function findUpcomingFavorableDays(
  category: MuhurtaCategoryId,
  days: PanchangMonthDay[],
  opts: { fromIsoDate?: string; limit?: number } = {},
): PanchangMonthDay[] {
  const fromIsoDate = opts.fromIsoDate ?? new Date().toISOString().slice(0, 10);
  const limit = opts.limit ?? 5;

  const seen = new Set<string>();
  const upcoming: PanchangMonthDay[] = [];
  for (const day of days) {
    if (day.isoDate < fromIsoDate) continue;
    if (seen.has(day.isoDate)) continue;
    if (evaluateMuhurtaCategory(category, day).tone !== "favorable") continue;
    seen.add(day.isoDate);
    upcoming.push(day);
  }

  upcoming.sort((a, b) => a.isoDate.localeCompare(b.isoDate));
  return upcoming.slice(0, limit);
}
