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

/** Finds a planet's sign inside chart.planets by (case-insensitive) planet name. */
function readPlanetSign(
  chart: Record<string, unknown> | null | undefined,
  planetName: string,
): string | undefined {
  const planets = chart?.planets;
  if (!Array.isArray(planets)) return undefined;
  const match = planets.find(
    (p) =>
      p &&
      typeof p === "object" &&
      String((p as Record<string, unknown>).planet ?? "").toLowerCase() === planetName.toLowerCase(),
  );
  return match ? readString(match as Record<string, unknown>, "sign") : undefined;
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

  const sunSign =
    readString(chart, "sunSign") ?? readNested(chart, ["sun", "sign"]) ?? readPlanetSign(chart, "Sun");

  return { ascendant, moonSign, sunSign };
}
