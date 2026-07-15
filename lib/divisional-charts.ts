// =============================================================================
// Divisional Chart (Varga) Calculations — frontend port
// =============================================================================
//
// The live backend defines these same pure functions in
// `jyotish-backend/src/lib/astro-engine/charts/divisionalCharts.ts` but never
// computes/stores the result on the kundli row, so `chart.divisionalCharts` is
// always undefined over the wire. We recompute them here from the natal planet
// longitudes (which ARE delivered) so the Rashi/Navamsa/Dasamsa carousel and the
// technical Varga tabs work for every user with no backend change or migration.
//
// SOURCE OF TRUTH: keep the math below in sync with the backend module above.
// All functions take a sidereal longitude (0-360) and return a sign index (0-11).
// =============================================================================

export const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const;

type Planet = 'Sun' | 'Moon' | 'Mars' | 'Mercury' | 'Jupiter' | 'Venus' | 'Saturn' | 'Rahu' | 'Ketu';

const SIGN_LORDS: Record<string, Planet> = {
  Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
  Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Mars',
  Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Saturn', Pisces: 'Jupiter',
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function mod12(n: number): number {
  return ((n % 12) + 12) % 12;
}
function signIndexOf(longitude: number): number {
  return Math.floor((((longitude % 360) + 360) % 360) / 30);
}
function signDegreeOf(longitude: number): number {
  let n = longitude % 360;
  if (n < 0) n += 360;
  return n % 30;
}
/** Aries(0)=odd(1st), Taurus(1)=even(2nd), etc. */
function isOddSign(idx: number): boolean {
  return idx % 2 === 0;
}
/** 0=Fire, 1=Earth, 2=Air, 3=Water */
function signElement(idx: number): number {
  return idx % 4;
}
/** 0=Movable(Cardinal), 1=Fixed, 2=Dual(Mutable) */
function signModality(idx: number): number {
  return idx % 3;
}

// ─── Calculators (verbatim from backend) ─────────────────────────────────────

function calculateD1(lon: number): number {
  return signIndexOf(lon);
}
function calculateD2(lon: number): number {
  const si = signIndexOf(lon);
  const firstHalf = signDegreeOf(lon) < 15;
  if (isOddSign(si)) return firstHalf ? 4 : 3;
  return firstHalf ? 3 : 4;
}
function calculateD3(lon: number): number {
  const si = signIndexOf(lon);
  const part = Math.floor(signDegreeOf(lon) / 10);
  const offsets = [0, 4, 8];
  return mod12(si + offsets[part]!);
}
function calculateD4(lon: number): number {
  const si = signIndexOf(lon);
  const part = Math.floor(signDegreeOf(lon) / 7.5);
  const offsets = [0, 3, 6, 9];
  return mod12(si + offsets[part]!);
}
function calculateD7(lon: number): number {
  const si = signIndexOf(lon);
  const part = Math.floor(signDegreeOf(lon) / (30 / 7));
  const startSign = isOddSign(si) ? si : mod12(si + 6);
  return mod12(startSign + part);
}
function calculateD9(lon: number): number {
  const si = signIndexOf(lon);
  const part = Math.floor(signDegreeOf(lon) / (30 / 9));
  const startSigns = [0, 9, 6, 3]; // Fire→Aries, Earth→Cap, Air→Libra, Water→Cancer
  return mod12(startSigns[signElement(si)]! + part);
}
function calculateD10(lon: number): number {
  const si = signIndexOf(lon);
  const part = Math.floor(signDegreeOf(lon) / 3);
  const startSign = isOddSign(si) ? si : mod12(si + 8);
  return mod12(startSign + part);
}
function calculateD12(lon: number): number {
  const si = signIndexOf(lon);
  const part = Math.floor(signDegreeOf(lon) / 2.5);
  return mod12(si + part);
}
function calculateD16(lon: number): number {
  const si = signIndexOf(lon);
  const part = Math.floor(signDegreeOf(lon) / (30 / 16));
  const startSigns = [0, 4, 8]; // Movable→Aries, Fixed→Leo, Dual→Sag
  return mod12(startSigns[signModality(si)]! + part);
}
function calculateD20(lon: number): number {
  const si = signIndexOf(lon);
  const part = Math.floor(signDegreeOf(lon) / (30 / 20));
  const startSigns = [0, 8, 4]; // Movable→Aries, Fixed→Sag, Dual→Leo
  return mod12(startSigns[signModality(si)]! + part);
}
function calculateD24(lon: number): number {
  const si = signIndexOf(lon);
  const part = Math.floor(signDegreeOf(lon) / (30 / 24));
  const startSign = isOddSign(si) ? 4 : 3; // Leo or Cancer
  return mod12(startSign + part);
}
function calculateD27(lon: number): number {
  const si = signIndexOf(lon);
  const part = Math.floor(signDegreeOf(lon) / (30 / 27));
  const startSigns = [0, 3, 6, 9]; // Fire→Aries, Earth→Cancer, Air→Libra, Water→Cap
  return mod12(startSigns[signElement(si)]! + part);
}
function calculateD30(lon: number): number {
  const si = signIndexOf(lon);
  const deg = signDegreeOf(lon);
  const planetToSign: Record<string, number> = {
    Mars: 0, Saturn: 10, Jupiter: 8, Mercury: 2, Venus: 6,
  };
  let ruler: string;
  if (isOddSign(si)) {
    if (deg < 5) ruler = 'Mars';
    else if (deg < 10) ruler = 'Saturn';
    else if (deg < 18) ruler = 'Jupiter';
    else if (deg < 25) ruler = 'Mercury';
    else ruler = 'Venus';
  } else {
    if (deg < 5) ruler = 'Venus';
    else if (deg < 12) ruler = 'Mercury';
    else if (deg < 20) ruler = 'Jupiter';
    else if (deg < 25) ruler = 'Saturn';
    else ruler = 'Mars';
  }
  return planetToSign[ruler]!;
}
function calculateD40(lon: number): number {
  const si = signIndexOf(lon);
  const part = Math.floor(signDegreeOf(lon) / (30 / 40));
  const startSign = isOddSign(si) ? 0 : 6; // Aries or Libra
  return mod12(startSign + part);
}
function calculateD45(lon: number): number {
  const si = signIndexOf(lon);
  const part = Math.floor(signDegreeOf(lon) / (30 / 45));
  const startSigns = [0, 4, 8]; // Movable→Aries, Fixed→Leo, Dual→Sag
  return mod12(startSigns[signModality(si)]! + part);
}
function calculateD60(lon: number): number {
  const si = signIndexOf(lon);
  const part = Math.floor(signDegreeOf(lon) / 0.5);
  return mod12(si + part);
}

/** The varga set the technical tabs surface (matches VargaChartTabs.IMPORTANT_VARGAS). */
export const VARGA_KEYS = [
  'D1', 'D2', 'D3', 'D4', 'D7', 'D9', 'D10', 'D12',
  'D16', 'D20', 'D24', 'D27', 'D30', 'D40', 'D45', 'D60',
] as const;

export type VargaKey = (typeof VARGA_KEYS)[number];

const CALCULATORS: Record<VargaKey, (lon: number) => number> = {
  D1: calculateD1, D2: calculateD2, D3: calculateD3, D4: calculateD4,
  D7: calculateD7, D9: calculateD9, D10: calculateD10, D12: calculateD12,
  D16: calculateD16, D20: calculateD20, D24: calculateD24, D27: calculateD27,
  D30: calculateD30, D40: calculateD40, D45: calculateD45, D60: calculateD60,
};

// ─── Public shapes ───────────────────────────────────────────────────────────

export interface VargaData {
  planets: { planet: string; sign: string; signIndex: number }[];
  ascendantSignIndex: number;
}

/** A natal planet as delivered to the frontend (REST or swarm). */
interface NatalPlanetLike {
  planet: string;
  longitude?: number;
  signIndex?: number;
  signDegree?: number;
  degree?: number;
  [key: string]: unknown;
}

/** Ascendant as delivered to the frontend (field names vary between paths). */
interface AscendantLike {
  signIndex?: number;
  sign?: string;
  ascendantSign?: string;
  degrees?: number;
  degree?: number;
  ascendantDegree?: number;
  [key: string]: unknown;
}

/** Reconstruct a sidereal longitude from whatever fields a planet carries. */
function planetLongitude(p: NatalPlanetLike): number {
  if (typeof p.longitude === 'number') return p.longitude;
  const si = typeof p.signIndex === 'number' ? p.signIndex : 0;
  const deg = p.signDegree ?? p.degree ?? 0;
  return si * 30 + deg;
}

/** Reconstruct the ascendant longitude, or null when we can't. */
function ascendantLongitude(asc: AscendantLike | null | undefined): number | null {
  if (!asc) return null;
  let si = typeof asc.signIndex === 'number' ? asc.signIndex : undefined;
  if (si === undefined) {
    const name = asc.ascendantSign ?? asc.sign;
    if (name) {
      const idx = SIGNS.indexOf(name as (typeof SIGNS)[number]);
      if (idx >= 0) si = idx;
    }
  }
  if (si === undefined) return null;
  const deg = asc.degrees ?? asc.degree ?? asc.ascendantDegree ?? 0;
  return si * 30 + deg;
}

/**
 * Compute every varga in VARGA_KEYS from the natal planets + ascendant.
 * Returns the same shape the (never-populated) backend field would have:
 * `{ [vargaKey]: { planets, ascendantSignIndex } }`.
 */
export function computeDivisionalCharts(
  planets: NatalPlanetLike[],
  ascendant: AscendantLike | null | undefined,
): Record<string, VargaData> {
  if (!planets?.length) return {};
  const ascLon = ascendantLongitude(ascendant);
  const fallbackAscSign = typeof ascendant?.signIndex === 'number' ? ascendant.signIndex : 0;

  const result: Record<string, VargaData> = {};
  for (const key of VARGA_KEYS) {
    const calc = CALCULATORS[key];
    const vplanets = planets.map((p) => {
      const si = calc(planetLongitude(p));
      return { planet: p.planet, sign: SIGNS[si]!, signIndex: si };
    });
    result[key] = {
      planets: vplanets,
      ascendantSignIndex: ascLon === null ? fallbackAscSign : calc(ascLon),
    };
  }
  return result;
}

/**
 * Turn a varga into `{ houses, planets }` renderable by NorthIndianChart /
 * SouthIndianChart. Houses are whole-sign counted from the varga Lagna.
 * Shared by the chart carousel and the technical Varga tabs.
 */
export function buildVargaRenderData(varga: VargaData) {
  const ascIdx = varga.ascendantSignIndex;

  const houses = Array.from({ length: 12 }, (_, i) => {
    const signIdx = mod12(ascIdx + i);
    const sign = SIGNS[signIdx]!;
    return {
      house: i + 1,
      cusp: signIdx * 30,
      sign,
      signIndex: signIdx,
      lord: SIGN_LORDS[sign] as Planet,
      planets: varga.planets
        .filter((p) => p.signIndex === signIdx)
        .map((p) => p.planet) as Planet[],
    };
  });

  const planets = varga.planets.map((p) => ({
    planet: p.planet as Planet,
    sign: p.sign,
    signIndex: p.signIndex,
    isRetrograde: false,
    house: mod12(p.signIndex - ascIdx) + 1,
  }));

  return { houses, planets };
}
