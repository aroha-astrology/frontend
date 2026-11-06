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
}
