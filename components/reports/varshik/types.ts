/**
 * The slice of the Varshik Rashifal 2027 facts object (backend: varshik-facts.ts) that the chart
 * components read. Kept as plain interfaces so the components can be fed the report JSON as it
 * arrives from the API, and so a Storybook-free preview page can feed them a fixture.
 */

export type Tier = "dark_green" | "light_green" | "amber" | "rust";
export const AREAS = ["love", "career", "money", "health", "family", "growth", "travel"] as const;
export type Area = (typeof AREAS)[number];

export interface Cell {
  score: number;
  tier: Tier;
}

export interface PlanetImpactRow {
  planet: string;
  natalHouse: number | null;
  varshaHouses: number[];
  roles: string[];
  strength: number | null;
  transitHouses: number[];
  effect: "helping" | "weighing" | "neutral";
  bestMonth: number;
  hardMonth: number;
  topArea: { area: Area; effect: number };
}

export interface DecisionRow {
  key: string;
  months: Cell[];
  best: { from: number; to: number; score: number; tier: Tier };
  hold: number[];
  isMain: boolean;
  /** C5 (absent in older reports): a wedding, commitment or move-in row whose window keeps out of the closures. */
  closed?: boolean;
  /** C5: the open runs of days inside the best window. */
  openSpans?: { from: string; to: string }[];
  /** C5: the year's no-muhurat periods that touch this row. */
  closures?: Closure[];
  /** C5: per closure, 'panchang' when a panchang states the rule for this event, 'report' when it is the report's own rule. */
  ruleSource?: ("panchang" | "report")[];
  noOpenWindow?: boolean;
}

export type ClosureReason = "shukra_asta" | "guru_asta" | "kharmas" | "chaturmas";

export interface Closure {
  reason: ClosureReason;
  from: string;
  to: string;
}

export interface PanchadhikariRow {
  role: string;
  planet: string;
  strength: number;
  aspectsLagna: boolean;
}

export interface VarshaYear {
  targetYear: number;
  startsAt: string;
  endsAt: string;
  startMs: number;
  endMs: number;
  isDayReturn: boolean;
  lagna: string;
  lagnaIndex: number;
  muntha: { sign: string; house: number; lord: string; auspicious: boolean };
  yearLord: string;
  wonByMunthaTiebreak: boolean;
  panchadhikari: PanchadhikariRow[];
  panchavargi: Record<string, number>;
  mudda: { lord: string; from: string; to: string }[];
  /** C3: Mudda Yogini, Patyayini (by the week) and Tri-Pataki. Absent in a report made before C3. */
  extra?: VarshaExtraFacts;
}

export interface TransitRow {
  month: number;
  planet: string;
  sign: string;
  natalHouse: number;
  /** C5: counted from the natal Moon sign (absent in older reports). */
  moonHouse?: number;
  bindus: number;
  kakshya: string;
}

export interface SahamWindow {
  saham: string;
  planet: string;
  from: string;
  to: string;
  exact: string[];
  strength: number;
}

export interface DoshaFact {
  key: string;
  label: string;
  status: "present" | "cancelled" | "not_present";
  cancellations: string[];
  activeMonths: number[];
  because: Record<string, string[]>;
  touches: string;
  remedy: string;
}

export interface YogaFact {
  source: "natal" | "tajika";
  name: string;
  kind: string;
  planets: string[];
  months: number[];
  because: Record<string, string[]>;
  targetYear: number | null;
  reason?: string;
}

export type SkyEventKind =
  | "ingress"
  | "station-retrograde"
  | "station-direct"
  | "combust-in"
  | "combust-out"
  | "eclipse-solar"
  | "eclipse-lunar";

export interface SkyEventFact {
  kind: SkyEventKind;
  planet: string;
  date: string;
  month: number;
  sign: string;
  fromSign: string | null;
  natalHouse: number;
  /** C5: counted from the natal Moon sign (absent in older reports). */
  moonHouse?: number;
  varshaHouse: number;
  /** C5: eclipses only. */
  eclipse?: EclipseInfo;
}

export type EclipseClass = "grahan" | "upachchaya" | "not_visible";

export interface EclipseInfo {
  subtype: "total" | "annular" | "hybrid" | "partial" | "penumbral";
  magnitude: number;
  penumbralMagnitude: number | null;
  class: EclipseClass;
  /** Local times in reader.eclipsePlace.tz. */
  places: { name: string; visible: boolean; from: string | null; to: string | null; magnitude: number | null }[];
  sutak: { place: string; from: string; to: string }[];
  personalTrigger: boolean;
}

export interface EclipsePlace {
  scope: "reader" | "india";
  name: string;
  tz: string;
}

/** What each chart reads, by name, from the facts object. */
export interface VarshikChartFacts {
  scores: {
    overall: Cell;
    months: Cell[];
    timingMap: Record<string, Cell[]>;
    areaOverall: Record<string, Cell>;
    peakMonths: number[];
    restMonth: number;
    decisionTable: DecisionRow[];
    planetImpact: PlanetImpactRow[];
    dailyOverall: number[];
  };
  varsha: VarshaYear[];
  ashtakavarga: { transits: TransitRow[] };
  sahamWindows: SahamWindow[];
  doshas: DoshaFact[];
  yogas: YogaFact[];
  skyEvents: SkyEventFact[];
  /** C3: absent in a report made before the star layer was added. */
  stars?: StarFacts;
}

export interface PlanetRow {
  planet: string;
  sign: string;
  signIndex: number;
  degree: number;
  house: number;
  nakshatra: string;
  pada: number;
  retrograde: boolean;
  combust: boolean;
  dignity: string;
}

export interface WindowFact {
  fromDate: string;
  toDate: string;
  peakDate: string;
  score: number;
  tier: Tier;
}

export interface ReliefEvent {
  date: string;
  kind: string;
  effect: "relief" | "hard";
  detail: string;
  temporary?: boolean;
}

/** The whole frozen facts object the report screen reads (a superset of what the charts read). */
export interface VarshikFacts extends Omit<VarshikChartFacts, "scores"> {
  /** The calendar year the report reads (absent in a report saved before the year became a parameter: 2027). */
  year?: number;
  window: { start: string; end: string };
  reader: {
    name: string | null;
    birthDate: string;
    birthTime: string;
    timezone: string;
    answers: { relationship?: string; occupation?: string; children?: string; mainDecision?: string };
    facts: { id: string; fact: string }[];
    /** C5: where eclipses are judged (absent in older reports). */
    eclipsePlace?: EclipsePlace;
  };
  birth: {
    lagna: { sign: string; signIndex: number; degree: number; nakshatra: string; pada: number };
    planets: PlanetRow[];
  };
  dashas: { balance: { planet: string; yearsLeft: number } };
  calendar: {
    festivals: { date: string; month: number; name: string; importance: "major" | "minor" }[];
    /** C5: Shukra Asta, Guru Asta, Kharmas and Chaturmas of the year (absent in older reports). */
    closures?: Closure[];
  };
  scores: VarshikChartFacts["scores"] & {
    areaOverall: Record<string, Cell>;
    why: { lifting: { key: string; effect: number }[]; weighing: { key: string; effect: number }[] }[];
    answerWindows: Record<string, { best: WindowFact; then: WindowFact | null; weak: boolean }>;
    relief: {
      lookbackFrom: string;
      lookbackTo: string;
      lookback: ReliefEvent[];
      wasHard: boolean;
      saturnDamperDays: number;
      varsha2026: { yearLord: string; munthaHouse: number; munthaAuspicious: boolean; endedOn: string } | null;
      ahead: ReliefEvent[];
      nextRelief: ReliefEvent | null;
      reliefInYear: boolean;
      nextReliefBeyondYear: ReliefEvent | null;
    };
  };
}

// -----------------------------------------------------------------------------
// C3: the star layer and the other dashas (backend: varshik-facts-c3.ts)
// -----------------------------------------------------------------------------

export interface TaraFact {
  number: number;
  name: string;
  good: boolean;
  plain: string;
}

export interface SpecialTaraFact {
  number: number;
  name: string;
  plain: string;
}

export interface StarRow {
  point: string;
  sign: string;
  house: number;
  nakshatra: string;
  pada: number;
  starLord: string;
  starLordHouse: number;
  starLordRules: number[];
  navamsaSign: string;
  gana: string;
  deity: string;
  symbol: string;
  nature: string;
  shakti: string;
  kpStarLord: string;
  kpSubLord: string;
  subLordHouse: number;
  gandanta: { present: boolean; part: string | null; degrees: number | null };
  tara: TaraFact;
  special: SpecialTaraFact | null;
}

export interface StarSegmentFact {
  planet: string;
  from: string;
  to: string;
  enters: boolean;
  retro: boolean;
  nakshatra: string;
  tara: TaraFact;
  special: SpecialTaraFact | null;
  starLord: string;
  starLordHouse: number;
  natalPointsHere: string[];
}

export interface MoortiFact {
  planet: string;
  date: string;
  fromSign: string;
  toSign: string;
  moonHouse: number;
  moorti: "swarna" | "rajata" | "tamra" | "loha";
  metal: string;
  quality: string;
  plain: string;
}

export interface StarFacts {
  birthStar: { name: string; number: number; pada: number; lord: string; sign: string };
  table: StarRow[];
  navatara: {
    weakened: { planet: string; tara: TaraFact }[];
    emphasised: { point: string; special: SpecialTaraFact }[];
  };
  dashaLords: {
    planet: string;
    roles: ("maha" | "antar" | "pratyantar" | "mudda")[];
    nakshatra: string;
    pada: number;
    starLord: string;
    starLordHouse: number;
    subLord: string;
    subLordHouse: number;
    gandanta: boolean;
  }[];
  segments: StarSegmentFact[];
  sensitive: { planet: string; from: string; to: string; enters: boolean; nakshatra: string; special: SpecialTaraFact | null; natalPointsHere: string[] }[];
  moorti: MoortiFact[];
}

export interface TriPatakiFlag {
  body: string;
  nature: "benefic" | "malefic";
}

export interface VarshaExtraFacts {
  muddaYogini: { lord: string; yogini: string; from: string; to: string }[];
  patyayini: { lord: string; fromWeek: string; toWeek: string }[];
  triPataki: { lines: string[]; onLagna: TriPatakiFlag[]; onMoon: TriPatakiFlag[] };
}
