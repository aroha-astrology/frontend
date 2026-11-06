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
}

export interface TransitRow {
  month: number;
  planet: string;
  sign: string;
  natalHouse: number;
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
  varshaHouse: number;
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
  window: { start: string; end: string };
  reader: {
    name: string | null;
    birthDate: string;
    birthTime: string;
    timezone: string;
    answers: { relationship?: string; occupation?: string; children?: string; mainDecision?: string };
    facts: { id: string; fact: string }[];
  };
  birth: {
    lagna: { sign: string; signIndex: number; degree: number; nakshatra: string; pada: number };
    planets: PlanetRow[];
  };
  dashas: { balance: { planet: string; yearsLeft: number } };
  calendar: { festivals: { date: string; month: number; name: string; importance: "major" | "minor" }[] };
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
