// Small defensive readers for the loosely-typed `chart` blob returned by the
// backend (`Record<string, unknown>` — the shape varies slightly by source),
// shared so every caller stays in sync on where a given fact might live.

import type { Kundli } from "./api";

export function readString(obj: Record<string, unknown> | null | undefined, key: string): string | undefined {
  const v = obj?.[key];
  return typeof v === "string" ? v : undefined;
}

export function readNested(obj: Record<string, unknown> | null | undefined, path: string[]): string | undefined {
  let cur: unknown = obj;
  for (const k of path) {
    if (cur && typeof cur === "object" && k in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[k];
    } else {
      return undefined;
    }
  }
  return typeof cur === "string" ? cur : undefined;
}

function readNumber(obj: Record<string, unknown> | null | undefined, key: string): number | undefined {
  const v = obj?.[key];
  return typeof v === "number" ? v : undefined;
}

const ZODIAC_SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

/**
 * "Sun Sign" is shown as the Western tropical sign (what someone means by "I'm
 * a Cancer"), not the Vedic sidereal sign the rest of the chart uses — the two
 * differ by the ayanamsa (~24°). Derived from the sidereal longitude +
 * ayanamsaValue (both already stored on every chart) rather than a
 * calendar-date table, so it's exact for cusp births too. Falls back to
 * undefined (caller falls back to the sidereal sign) if either input is
 * missing, e.g. an older/degraded chart.
 */
export function westernSunSign(
  sunLongitude: number | undefined,
  ayanamsaValue: number | null | undefined,
): string | undefined {
  if (typeof sunLongitude !== "number" || typeof ayanamsaValue !== "number") return undefined;
  const tropicalLongitude = ((sunLongitude + ayanamsaValue) % 360 + 360) % 360;
  return ZODIAC_SIGNS[Math.floor(tropicalLongitude / 30)];
}

/** The user's natal Moon sign, or undefined if the kundli isn't ready / doesn't have one. */
export function getUserMoonSign(kundli: Kundli | null): string | undefined {
  if (!kundli?.chart) return undefined;
  return readString(kundli.chart, "moonSign") ?? readNested(kundli.chart, ["moon", "sign"]);
}

export interface ChartSigns {
  ascendant?: string;
  moonSign?: string;
  sunSign?: string;
}

/** Finds a planet's entry inside chart.planets by (case-insensitive) planet name. */
function findPlanet(
  chart: Record<string, unknown> | null | undefined,
  planetName: string,
): Record<string, unknown> | undefined {
  const planets = chart?.planets;
  if (!Array.isArray(planets)) return undefined;
  return planets.find(
    (p) =>
      p &&
      typeof p === "object" &&
      String((p as Record<string, unknown>).planet ?? "").toLowerCase() === planetName.toLowerCase(),
  ) as Record<string, unknown> | undefined;
}

/** Finds a planet's sign inside chart.planets by (case-insensitive) planet name. */
function readPlanetSign(
  chart: Record<string, unknown> | null | undefined,
  planetName: string,
): string | undefined {
  const match = findPlanet(chart, planetName);
  return match ? readString(match, "sign") : undefined;
}

/**
 * Extracts { ascendant, moonSign, sunSign } from a natal chart blob, tolerating
 * the handful of shapes the backend/onboarding response has used
 * (flat "ascendant"/"moonSign"/"sunSign" string fields, a nested
 * `ascendant: { ascendantSign | sign }` object, `{ moon: { sign } }` /
 * `{ sun: { sign } }` objects, or falling back to the `planets` array).
 * Consolidates logic previously duplicated between KundliSummary and
 * KundliCard. This only extracts the raw English sign name — callers are
 * still responsible for localizing it (see `zodiacSignLabel` in
 * `data/zodiac.ts`) before rendering.
 *
 * `sunSign` is deliberately the WESTERN TROPICAL sign, not the Vedic sidereal
 * sign the rest of the chart uses (see `westernSunSign` above) — this is the
 * single choke point every "Sun Sign" display in the app should read from so
 * they can't drift apart again the way the Kundli page and the Home
 * card/menu drawer once did (2026-07-10 fix was applied to the Kundli page
 * only, leaving this function — and everything reading it — on the old
 * sidereal value).
 */
export function extractChartSigns(chart: Record<string, unknown> | null | undefined): ChartSigns {
  if (!chart) return {};

  const ascendantField = chart.ascendant;
  const ascendant =
    typeof ascendantField === "string"
      ? ascendantField
      : ascendantField && typeof ascendantField === "object"
        ? (readString(ascendantField as Record<string, unknown>, "ascendantSign") ??
          readString(ascendantField as Record<string, unknown>, "sign"))
        : undefined;

  const moonSign =
    readString(chart, "moonSign") ?? readNested(chart, ["moon", "sign"]) ?? readPlanetSign(chart, "Moon");

  const sunPlanet = findPlanet(chart, "Sun");
  const sunSign =
    readString(chart, "sunSign") ??
    readNested(chart, ["sun", "sign"]) ??
    westernSunSign(readNumber(sunPlanet, "longitude"), readNumber(chart, "ayanamsaValue")) ??
    (sunPlanet ? readString(sunPlanet, "sign") : undefined);

  return { ascendant, moonSign, sunSign };
}
