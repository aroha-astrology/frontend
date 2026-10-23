/**
 * Geometry for the 360° sidereal wheel (switch experience.wheelChart): where each planet sits on a
 * circle that has the ascendant at the left (9 o'clock) and the signs running counter-clockwise, the
 * way a Western chart is drawn. All angles are in degrees measured from 3 o'clock, counter-clockwise,
 * and turned into screen coordinates only at the last step.
 */

export const SIGN_NAMES = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;

export function signIndexOf(sign: unknown): number {
  if (typeof sign !== "string") return -1;
  return SIGN_NAMES.findIndex((s) => s.toLowerCase() === sign.toLowerCase());
}

const wrap360 = (deg: number) => ((deg % 360) + 360) % 360;

/** The ascendant's sidereal longitude, from its sign and degree inside the sign. Null when unknown. */
export function ascendantLongitude(ascendant: Record<string, any> | null | undefined): number | null {
  if (!ascendant) return null;
  const direct = ascendant.longitude;
  if (typeof direct === "number") return wrap360(direct);
  const idx = signIndexOf(ascendant.ascendantSign ?? ascendant.sign);
  if (idx < 0) return null;
  const deg = ascendant.degrees ?? ascendant.degree ?? ascendant.ascendantDegree ?? 0;
  return idx * 30 + (typeof deg === "number" ? deg : 0);
}

/** The screen angle for a longitude, with the ascendant fixed at 180° (left). */
export function wheelAngle(longitude: number, ascLongitude: number): number {
  return wrap360(180 - (longitude - ascLongitude));
}

export interface WheelPlanet {
  planet: string;
  /** Sidereal longitude, 0-360. */
  longitude: number;
  /** Where the glyph is drawn, after nudging apart from its neighbours. */
  angle: number;
  /** The planet's true angle, for the pointer tick on the rim. */
  trueAngle: number;
  retrograde: boolean;
}

/**
 * Planets in chart order with an angle each. Planets closer than `minGap` degrees are nudged apart,
 * in order around the circle, so glyphs never sit on top of one another; the true angle is kept.
 */
export function wheelPlanets(
  planets: readonly Record<string, any>[],
  ascLongitude: number,
  minGap = 12,
): WheelPlanet[] {
  const items: WheelPlanet[] = planets
    .filter((p) => typeof p?.longitude === "number" && typeof p?.planet === "string")
    .map((p) => {
      const trueAngle = wheelAngle(p.longitude, ascLongitude);
      return {
        planet: p.planet as string,
        longitude: wrap360(p.longitude),
        angle: trueAngle,
        trueAngle,
        retrograde: Boolean(p.isRetrograde ?? p.retrograde),
      };
    })
    .sort((a, b) => a.trueAngle - b.trueAngle);

  // Push each glyph at least minGap past the one before it; a final pass keeps the wrap-around gap.
  for (let i = 1; i < items.length; i++) {
    const prev = items[i - 1]!;
    if (items[i]!.angle - prev.angle < minGap) items[i]!.angle = prev.angle + minGap;
  }
  const last = items[items.length - 1];
  const first = items[0];
  if (last && first && first.angle + 360 - last.angle < minGap) {
    const shift = (minGap - (first.angle + 360 - last.angle)) / 2;
    first.angle += shift;
    last.angle -= shift;
  }
  return items;
}

/** Degrees to screen coordinates around (cx, cy) at radius r; y grows downwards on screen. */
export function polar(cx: number, cy: number, r: number, angleDeg: number): { x: number; y: number } {
  const a = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) };
}

/** The sector (0-11) each whole-sign house covers, as the start angle of sign index `i`. */
export function signStartAngle(signIndex: number, ascLongitude: number): number {
  return wheelAngle(signIndex * 30, ascLongitude);
}
