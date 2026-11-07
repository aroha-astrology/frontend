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
  const mid = Date.UTC(2027, m, 15);
  return facts.varsha.find((v) => v.startMs <= mid && mid < v.endMs) ?? facts.varsha[facts.varsha.length - 1];
}

/** Mudda dasha periods that touch month `m`, with their dates clipped to the month. */
export function muddaInMonth(facts: VarshikFacts, m: number) {
  const first = `2027-${String(m + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(2027, m + 1, 0)).getUTCDate();
  const last = `2027-${String(m + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return facts.varsha
    .flatMap((v) => v.mudda)
    .filter((p) => p.from <= last && p.to >= first)
    .map((p) => ({ lord: p.lord, from: p.from < first ? first : p.from, to: p.to > last ? last : p.to }));
}

export interface KeyDate {
  date: string;
  kind: "sky" | "saham" | "festival";
  sky?: SkyEventFact;
  label?: string;
  major?: boolean;
}

const SLOW = new Set(["Saturn", "Jupiter", "Rahu", "Ketu"]);

/** The dates worth printing for month `m`: eclipses, stations, slow ingresses, Saham peaks and festivals. */
export function keyDatesOf(facts: VarshikFacts, m: number, cap = 9): KeyDate[] {
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
  return [...sky, ...saham, ...fest].sort((a, b) => a.date.localeCompare(b.date)).slice(0, cap);
}

/** The months of one area, best two and weakest one, for an area page. */
export function areaExtremes(cells: Cell[]) {
  const idx = cells.map((c, i) => ({ i, s: c.score })).sort((a, b) => b.s - a.s);
  return { best: idx.slice(0, 2).map((x) => x.i).sort((a, b) => a - b), hold: idx.slice(-1).map((x) => x.i) };
}

export const areasPresent = (facts: VarshikFacts) => AREAS.filter((a) => facts.scores.timingMap[a]?.length === 12);
