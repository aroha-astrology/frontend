/**
 * The Now Bar: what is running right now where the reader is (switch live.nowBar).
 * The server builds the answer (GET /v1/widgets/live-now, under 2 KB, cached 15 minutes); this file
 * is its shape and the few rules for turning it into words.
 */

export interface LiveNow {
  v: 1;
  asOf: string;
  tz: string;
  date: string;
  clock: string;
  tithi: { n: number; name: string; paksha: "Shukla" | "Krishna" };
  nakshatra: { name: string; pada: number };
  vara: string;
  hora: { planet: string; start: string; end: string; good: boolean } | null;
  choghadiya: { name: string; type: "good" | "bad" | "neutral"; start: string; end: string } | null;
  rahuKaal: { start: string; end: string; on: boolean };
  abhijit: { start: string; end: string; on: boolean };
  nextGood: { label: string; start: string; inMin: number } | null;
  nextCaution: { label: string; start: string; inMin: number } | null;
  sunrise: string;
  sunset: string;
}

/** An answer is good for 15 minutes; after that the bar asks again. */
export const LIVE_NOW_REFRESH_MS = 15 * 60_000;

/** The kind of moment the bar leads with, strongest first. */
export type NowTone = "caution" | "good" | "neutral";

export function nowTone(live: LiveNow): NowTone {
  if (live.rahuKaal.on) return "caution";
  if (live.abhijit.on) return "good";
  if (live.choghadiya?.type === "bad") return "caution";
  if (live.choghadiya?.type === "good") return "good";
  return "neutral";
}

/** "1 h 5 min" / "35 min": a wait in minutes as a short phrase's numbers (the words come from i18n). */
export function splitMinutes(total: number): { hours: number; minutes: number } {
  const t = Math.max(0, Math.round(total));
  return { hours: Math.floor(t / 60), minutes: t % 60 };
}

/** The lower-case key the Choghadiya names are filed under (`muhurtaNames.<key>`). */
export function muhurtaKey(name: string): string {
  return name.trim().toLowerCase();
}

/** Planet name as the i18n files spell it: `astro.planets.<key>`-style lower case. */
export function planetKey(planet: string): string {
  return planet.trim().toLowerCase();
}

/** Is this answer still good at `now`? */
export function isFresh(live: LiveNow, now: number): boolean {
  const built = Date.parse(live.asOf);
  return Number.isFinite(built) && now - built < LIVE_NOW_REFRESH_MS;
}

/** New Delhi: what the bar shows when the reader has not shared a location. */
export const REFERENCE_PLACE = { lat: 28.6139, lon: 77.209, tz: "Asia/Kolkata", name: "Delhi" } as const;

export interface NowPlace {
  lat: number;
  lon: number;
  tz: string;
  /** A city name when known, else null (the card then says "your location"). */
  name: string | null;
  /** True when this is Delhi because no place is known. */
  reference: boolean;
}

/**
 * Where the bar looks: the home city while the reader is away and chose to keep home (travel pill),
 * else the device's shared position on the device's own zone, else Delhi. Never asks for a location.
 */
export function resolveNowPlace(
  home: { name: string; lat: number; lon: number; tz: string } | null,
  shared: { lat: number; lon: number } | null,
  deviceTz: string,
): NowPlace {
  if (home) return { lat: home.lat, lon: home.lon, tz: home.tz, name: home.name, reference: false };
  if (shared) return { lat: shared.lat, lon: shared.lon, tz: deviceTz, name: null, reference: false };
  return { ...REFERENCE_PLACE, reference: true };
}

/** "in 35 min" / "in 1 h 5 min": the two numbers a phrase needs, from minutes. */
export function whenParts(inMin: number): { key: "inMin" | "inHm"; vars: { n?: number; h?: number; m?: number } } {
  const { hours, minutes } = splitMinutes(inMin);
  return hours === 0 ? { key: "inMin", vars: { n: minutes } } : { key: "inHm", vars: { h: hours, m: minutes } };
}

/** The i18n key a window's name is filed under (`muhurtaNames.<key>`): Abhijit and Rahu Kaal have their own. */
export function windowNameKey(label: string): string {
  if (label === "Abhijit") return "abhijit";
  if (label === "Rahu Kaal") return "rahuKaal";
  const lower = label.trim();
  return lower.charAt(0).toLowerCase() + lower.slice(1);
}
