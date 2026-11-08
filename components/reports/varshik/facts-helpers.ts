import type { Cell, SkyEventFact, VarshikFacts, VarshaYear } from "./types";
import { AREAS } from "./types";

const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const SIGN_LORD = ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"];

/** A six-digit edition number taken from the report id, the same every time for the same report. */
export function editionNumber(reportId: string): string {
  const n = parseInt(reportId.replace(/[^0-9a-f]/gi, "").slice(-6) || "0", 16) % 1_000_000;
  return String(n).padStart(6, "0");
}

/** Full month name in the reader's language. */
export function monthLong(m: number, lang: string): string {
  try {
    return new Intl.DateTimeFormat(lang, { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2027, m, 15)));
  } catch {
    return new Intl.DateTimeFormat("en", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2027, m, 15)));
  }
}

/** "12 Mar" in the reader's language, from 'YYYY-MM-DD'. */
export function shortDate(iso: string, lang: string): string {
  try {
    return new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
  } catch {
    return iso;
  }
}

/** The birth chart in the shape components/ui/NorthIndianChart reads. */
export function birthChartData(facts: VarshikFacts) {
  const lagna = facts.birth.lagna.signIndex;
  const planets = facts.birth.planets.map((p) => ({
    planet: p.planet as never,
    sign: p.sign,
    signIndex: p.signIndex,
    isRetrograde: p.retrograde,
    isCombust: p.combust,
    house: p.house,
  }));
  const houses = Array.from({ length: 12 }, (_, i) => {
    const signIndex = (lagna + i) % 12;
    return {
      house: i + 1,
      sign: SIGNS[signIndex]!,
      signIndex,
      lord: SIGN_LORD[signIndex] as never,
      planets: facts.birth.planets.filter((p) => p.house === i + 1).map((p) => p.planet as never),
    };
  });
  return { houses, planets };
}

/** The Varsha chart that rules the middle of month `m` (0-11). */
export function varshaInForce(facts: VarshikFacts, m: number): VarshaYear | undefined {
  const mid = Date.UTC(facts.year ?? 2027, m, 15);
  return facts.varsha.find((v) => v.startMs <= mid && mid < v.endMs) ?? facts.varsha[facts.varsha.length - 1];
}

/** Mudda dasha periods that touch month `m`, with their dates clipped to the month. */
export function muddaInMonth(facts: VarshikFacts, m: number) {
  const yr = facts.year ?? 2027;
  const first = `${yr}-${String(m + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(yr, m + 1, 0)).getUTCDate();
  const last = `${yr}-${String(m + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return facts.varsha
    .flatMap((v) => v.mudda)
    .filter((p) => p.from <= last && p.to >= first)
    .map((p) => ({ lord: p.lord, from: p.from < first ? first : p.from, to: p.to > last ? last : p.to }));
}

export interface KeyDate {
  date: string;
  kind: "sky" | "saham" | "festival" | "star" | "sensitive" | "moorti";
  sky?: SkyEventFact;
  label?: string;
  major?: boolean;
  /** Star dates: the planet, and the star (or the new sign for a Moorti) with its plain line. */
  planet?: string;
  plain?: string;
  plainKey?: string;
}

const SLOW = new Set(["Saturn", "Jupiter", "Rahu", "Ketu"]);

/** The dates worth printing for month `m`: eclipses, stations, slow ingresses, Saham peaks and festivals. */
export function keyDatesOf(facts: VarshikFacts, m: number, cap = 12): KeyDate[] {
  const weight = (e: SkyEventFact) =>
    e.kind.startsWith("eclipse") ? 0 : e.kind.startsWith("station") ? 1 : e.kind === "ingress" && (SLOW.has(e.planet) || e.planet === "Sun") ? 2 : 4;
  const sky: KeyDate[] = facts.skyEvents
    .filter((e) => e.month === m)
    .sort((a, b) => weight(a) - weight(b) || a.date.localeCompare(b.date))
    .slice(0, 6)
    .map((e) => ({ date: e.date, kind: "sky" as const, sky: e }));
  const saham: KeyDate[] = facts.sahamWindows
    .filter((w) => w.strength > 0 && w.exact[0] && Number(w.exact[0].slice(5, 7)) - 1 === m)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 2)
    .map((w) => ({ date: w.exact[0]!, kind: "saham" as const, label: w.saham }));
  const fest: KeyDate[] = facts.calendar.festivals
    .filter((f) => f.month === m)
    .sort((a, b) => (a.importance === b.importance ? 0 : a.importance === "major" ? -1 : 1))
    .slice(0, 4)
    .map((f) => ({ date: f.date, kind: "festival" as const, label: f.name, major: f.importance === "major" }));
  // C3: the slow planets' star changes (sensitive ones first) and the Moorti of their sign changes.
  const starDates: KeyDate[] = starDatesOf(facts, m)
    .sort((a, b) => Number(b.kind === "sensitive") - Number(a.kind === "sensitive"))
    .slice(0, 4)
    .map((d) => ({ date: d.date, kind: d.kind, label: d.what, planet: d.planet, plain: d.plain, plainKey: d.plainKey }));
  return [...sky, ...saham, ...fest, ...starDates].sort((a, b) => a.date.localeCompare(b.date)).slice(0, cap);
}

/** The months of one area, best two and weakest one, for an area page. */
export function areaExtremes(cells: Cell[]) {
  const idx = cells.map((c, i) => ({ i, s: c.score })).sort((a, b) => b.s - a.s);
  return { best: idx.slice(0, 2).map((x) => x.i).sort((a, b) => a - b), hold: idx.slice(-1).map((x) => x.i) };
}

export const areasPresent = (facts: VarshikFacts) => AREAS.filter((a) => facts.scores.timingMap[a]?.length === 12);

// -----------------------------------------------------------------------------
// C3: the star layer
// -----------------------------------------------------------------------------

/** "UttaraBhadrapada" -> "Uttara Bhadrapada". */
export const starLabel = (name: string): string => name.replace(/([a-z])([A-Z])/g, "$1 $2");

const SPECIAL_TARAS = [1, 4, 10, 12, 16, 18, 22, 25, 28] as const;
export type SpecialTaraNumber = (typeof SPECIAL_TARAS)[number];
/** Tara 2, 4, 6, 8 and 9 are the friendly ones. */
export const TARA_GOOD = new Set([2, 4, 6, 8, 9]);

export interface WheelSlot {
  /** 0-26, counted from the birth star. */
  offset: number;
  /** Star number 1-27. */
  star: number;
  tara: number;
  good: boolean;
  special: SpecialTaraNumber | null;
}

/**
 * The Navatara wheel: the 27 stars counted from the birth star, each with its tara (1-9, three times round), and
 * the sensitive stars marked. The special taras are counted on the 28-star ring (Abhijit between Uttara Ashadha
 * and Shravana), so the one that lands on Abhijit has no slot among the 27.
 */
export function wheelSlots(birthStarNumber: number): WheelSlot[] {
  const b = birthStarNumber - 1;
  const ring = (idx: number) => (idx <= 20 ? idx : idx + 1);
  const unring = (pos: number) => (pos <= 20 ? pos : pos === 21 ? -1 : pos - 1);
  const special = new Map<number, SpecialTaraNumber>();
  for (const s of SPECIAL_TARAS) {
    const idx = unring((ring(b) + s - 1) % 28);
    if (idx >= 0) special.set((idx - b + 27) % 27, s);
  }
  return Array.from({ length: 27 }, (_, i) => ({
    offset: i,
    star: ((b + i) % 27) + 1,
    tara: (i % 9) + 1,
    good: TARA_GOOD.has((i % 9) + 1),
    special: special.get(i) ?? null,
  }));
}

const SLOW_STAR = new Set(["Saturn", "Jupiter", "Rahu", "Ketu"]);

export interface StarDate {
  date: string;
  kind: "star" | "sensitive" | "moorti";
  planet: string;
  /** Star label for star dates, the new sign for a Moorti. */
  what: string;
  /** Plain line from the facts (tara or Moorti meaning), in English, and the i18n key that carries it in every language. */
  plain: string;
  plainKey: string;
  good?: boolean;
}

/**
 * The dated star events of month `m` for the slow planets and Mars: each entry into a star (marked sensitive when it is
 * a special tara or a natal planet's star) and the Moorti of each sign change. Empty for a report made before the star layer.
 */
export function starDatesOf(facts: VarshikFacts, m: number): StarDate[] {
  const st = facts.stars;
  if (!st) return [];
  const mm = `${facts.year ?? 2027}-${String(m + 1).padStart(2, "0")}`;
  const moving = (p: string) => SLOW_STAR.has(p) || p === "Mars";
  const out: StarDate[] = [];
  for (const s of st.segments) {
    if (!s.enters || !moving(s.planet) || !s.from.startsWith(mm)) continue;
    const sensitive = !!s.special || s.natalPointsHere.length > 0;
    out.push({
      date: s.from,
      kind: sensitive ? "sensitive" : "star",
      planet: s.planet,
      what: starLabel(s.nakshatra),
      plain: s.special ? s.special.plain : s.tara.plain,
      plainKey: s.special ? `varshik.starText.special.${s.special.number}` : `varshik.starText.tara.${s.tara.number}`,
      good: s.tara.good,
    });
  }
  for (const x of st.moorti) {
    if (!moving(x.planet) || !x.date.startsWith(mm)) continue;
    out.push({ date: x.date, kind: "moorti", planet: x.planet, what: x.toSign, plain: x.plain, plainKey: `varshik.starText.moorti.${x.moorti}` });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
