import { SIGN_NAMES } from "./wheel";

/**
 * Why a person's sign can be different in Western and Vedic astrology (switch experience.signShift).
 *
 * Western signs follow the seasons (tropical); Vedic signs follow the stars (sidereal, here Lahiri).
 * The two have drifted apart by the ayanamsa, about 24 degrees today (tropical = sidereal + ayanamsa).
 * That puts a Sun or Moon into the NEXT Western sign unless it sits in the first 6 degrees or so of its
 * Vedic sign, where the two systems still agree. So the card must be computed per person and say
 * so when nothing changes, never claim a shift that did not happen.
 */

const wrap360 = (deg: number) => ((deg % 360) + 360) % 360;
const signAt = (lon: number) => SIGN_NAMES[Math.floor(wrap360(lon) / 30)]!;

export interface BodyShift {
  /** Western (tropical) sign. */
  western: string;
  /** Vedic (sidereal) sign. */
  vedic: string;
  changed: boolean;
}

export interface SignShift {
  ayanamsa: number;
  sun: BodyShift;
  moon: BodyShift;
}

function body(siderealLongitude: number, ayanamsa: number): BodyShift {
  const vedic = signAt(siderealLongitude);
  const western = signAt(siderealLongitude + ayanamsa);
  return { western, vedic, changed: western !== vedic };
}

/** Null when the chart lacks the Sun, the Moon or the ayanamsa. */
export function signShift(
  planets: readonly Record<string, any>[] | null | undefined,
  ayanamsa: number | null | undefined,
): SignShift | null {
  if (!planets || typeof ayanamsa !== "number") return null;
  const find = (name: string) => planets.find((p) => String(p?.planet ?? "").toLowerCase() === name);
  const sun = find("sun");
  const moon = find("moon");
  if (typeof sun?.longitude !== "number" || typeof moon?.longitude !== "number") return null;
  return { ayanamsa, sun: body(sun.longitude, ayanamsa), moon: body(moon.longitude, ayanamsa) };
}
