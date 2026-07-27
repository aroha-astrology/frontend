// Daily guidance note — maps a day's core panchang facts (tithi/paksha/vara/
// nakshatra) to a short, classically-grounded guidance-note translation key.
//
// This module never returns text directly: every branch returns a
// `t()`-shaped key under `horoscope.panchang.guidance.*` (see i18n/resources.ts
// for the actual copy in all 7 languages) so the caller renders it via
// `useTranslation()`. That keeps this file pure/unit-testable and free of any
// hardcoded English, per the app's i18n convention.
//
// `tithiNumber` is expected in the app's standard 1-30 *absolute* numbering
// used throughout lib/api.ts's `PanchangMonthDay` (1-15 = Shukla Paksha,
// 16-30 = Krishna Paksha; see jyotish-backend's calculateTithi) — e.g.
// Krishna Paksha's Trayodashi is tithiNumber 28, not 13. As a defensive
// convenience for callers that only have the paksha-relative 1-15 number
// (e.g. hand-written tests), passing `paksha: "krishna"` with a 1-15 number
// is normalized to its 16-30 equivalent — see `toAbsoluteTithiNumber`.
//
// `vara` is expected in the exact string the backend emits (see
// jyotish-backend's WEEKDAY_NAMES): "Ravivaar", "Somvaar", "Mangalvaar",
// "Budhvaar", "Guruvaar", "Shukravaar", "Shanivaar" — NOT English weekday
// names. `nakshatraName` is expected in the backend's exact spelling (see
// @aroha-astrology/shared's NAKSHATRAS, e.g. "PurvaPhalguni", "Moola") —
// both are matched case-sensitively against those known values.
//
// Bucketing logic (classical basis), in priority order — first match wins:
//   1. Amavasya (30) / Purnima (15) / Ekadashi (11, 26) — the three most
//      astrologically significant tithis, so they override everything else.
//   2. Nakshatra-level signals: Pushya is traditionally the single most
//      all-round auspicious nakshatra ("Raja Nakshatra"); Ashlesha, Jyeshtha,
//      and Moola are the three serpent-tailed (Gandanta-adjacent) nakshatras
//      classical muhurta guides caution against for brand-new beginnings.
//      These are strong enough day-level signals to headline the note
//      ahead of an otherwise-ordinary tithi.
//   3. Vara (weekday) signals for Sunday (Surya's day) and Monday (Chandra's
//      day) — the two weekdays with the clearest, most commonly-cited
//      classical daily character in general (non-muhurta-specific) guidance.
//   4. The remaining 24 tithi numbers (1-14, 16-29 minus the ones already
//      claimed above), grouped by their paksha-relative tithi identity
//      (Pratipada, Dwitiya, ... Chaturdashi) — each pair (e.g. Dwitiya/17)
//      shares the same deity and classical character, except Trayodashi
//      (13 vs 28) which is deliberately split: Shukla Trayodashi's waxing,
//      expansive character reads differently from Krishna Trayodashi
//      (Pradosh — releasing what no longer serves).
//   5. Fallback: a general Shukla/Krishna Paksha note, only reachable with
//      out-of-range input (defensive — every valid 1-30 tithi is covered by
//      steps 1/4 above).

export type DayGuidanceInput = {
  tithiNumber: number;
  paksha: string;
  vara?: string;
  nakshatraName?: string;
};

const GUIDANCE_NS = "horoscope.panchang.guidance";
const key = (name: string) => `${GUIDANCE_NS}.${name}`;

/** The nakshatra traditionally considered the most universally auspicious. */
const PUSHYA_NAKSHATRA = "Pushya";

/** The three nakshatras classical muhurta guides caution against for new beginnings. */
const CAUTIOUS_NAKSHATRAS = new Set(["Ashlesha", "Jyeshtha", "Moola"]);

/** Backend weekday strings (see jyotish-backend's WEEKDAY_NAMES) — NOT English day names. */
const VARA_RAVIVAAR = "Ravivaar"; // Sunday
const VARA_SOMVAAR = "Somvaar"; // Monday

/**
 * Normalizes a possibly paksha-relative (1-15) tithi number to the app's
 * absolute 1-30 numbering when `paksha` unambiguously says "krishna". Every
 * real PanchangMonthDay from the API is already absolute, so this only
 * matters for callers/tests passing the relative form.
 */
function toAbsoluteTithiNumber(tithiNumber: number, paksha: string): number {
  const isKrishna = paksha.trim().toLowerCase() === "krishna";
  if (isKrishna && tithiNumber >= 1 && tithiNumber < 15) return tithiNumber + 15;
  return tithiNumber;
}

/**
 * Tithi-number -> guidance key for the 24 "ordinary" tithis (i.e. every
 * absolute 1-30 value except 11/15/26/30, which steps 1 above claim first).
 * Both paksha instances of the same tithi identity share a deity and so
 * share a key, except Trayodashi (13/28 — see module doc comment).
 */
const TITHI_GUIDANCE_KEYS: Record<number, string> = {
  1: key("pratipadaFreshStart"),
  16: key("pratipadaFreshStart"),
  2: key("dwitiyaPartnership"),
  17: key("dwitiyaPartnership"),
  3: key("tritiyaCelebration"),
  18: key("tritiyaCelebration"),
  4: key("chaturthiObstacles"),
  19: key("chaturthiObstacles"),
  5: key("panchamiLearning"),
  20: key("panchamiLearning"),
  6: key("shashthiCourage"),
  21: key("shashthiCourage"),
  7: key("saptamiLeadership"),
  22: key("saptamiLeadership"),
  8: key("ashtamiInnerStrength"),
  23: key("ashtamiInnerStrength"),
  9: key("navamiBoldAction"),
  24: key("navamiBoldAction"),
  10: key("dashamiResolve"),
  25: key("dashamiResolve"),
  12: key("dwadashiCharity"),
  27: key("dwadashiCharity"),
  13: key("reflectiveWriting"), // Shukla Trayodashi
  28: key("pradoshLettingGo"), // Krishna Trayodashi (Pradosh)
  14: key("chaturdashiInnerWork"),
  29: key("chaturdashiInnerWork"),
};

/**
 * Returns the `t()` key for today's short guidance note. Pure function —
 * caller renders the returned key with `useTranslation()`'s `t`.
 */
export function getDayGuidanceKey(input: DayGuidanceInput): string {
  const { paksha, vara, nakshatraName } = input;
  const tithiNumber = toAbsoluteTithiNumber(input.tithiNumber, paksha);

  // 1. The three most significant tithis, unconditionally.
  if (tithiNumber === 30) return key("amavasyaRest");
  if (tithiNumber === 15) return key("purnimaCulmination");
  if (tithiNumber === 11 || tithiNumber === 26) return key("ekadashiDiscipline");

  // 2. Nakshatra-level overrides.
  if (nakshatraName === PUSHYA_NAKSHATRA) return key("pushyaAuspicious");
  if (nakshatraName && CAUTIOUS_NAKSHATRAS.has(nakshatraName)) return key("cautiousNakshatra");

  // 3. Vara (weekday) overrides.
  if (vara === VARA_RAVIVAAR) return key("ravivaarVitality");
  if (vara === VARA_SOMVAAR) return key("somvaarEmotionalCare");

  // 4. The remaining 24 ordinary tithis.
  const tithiKey = TITHI_GUIDANCE_KEYS[tithiNumber];
  if (tithiKey) return tithiKey;

  // 5. Defensive fallback — only reachable for an out-of-range tithiNumber.
  const p = paksha.trim().toLowerCase();
  if (p === "shukla") return key("shuklaPakshaGeneral");
  if (p === "krishna") return key("krishnaPakshaGeneral");
  return key("generalDayGuidance");
}
