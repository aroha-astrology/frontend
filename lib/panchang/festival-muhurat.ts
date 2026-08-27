import type { PanchangData } from "@/lib/api";
import { timeToMinutes, minutesToTime } from "./time-window";

export type MuhuratAnchor = "sunrise" | "sunset" | "midnight" | "moonrise";

type AnchorSource = Pick<PanchangData, "sunriseTime" | "sunsetTime" | "moonriseTime">;

function deltaOf(ref?: string, user?: string): number | null {
  return ref && user ? timeToMinutes(user) - timeToMinutes(ref) : null;
}

function anchorDeltaMinutes(anchor: MuhuratAnchor, refData: AnchorSource, userData: AnchorSource): number | null {
  if (anchor === "sunrise") return deltaOf(refData.sunriseTime, userData.sunriseTime);
  if (anchor === "sunset") return deltaOf(refData.sunsetTime, userData.sunsetTime);
  if (anchor === "moonrise") return deltaOf(refData.moonriseTime, userData.moonriseTime);
  // midnight: average of sunrise+sunset deltas when both exist, else whichever does.
  const sunrise = deltaOf(refData.sunriseTime, userData.sunriseTime);
  const sunset = deltaOf(refData.sunsetTime, userData.sunsetTime);
  if (sunrise !== null && sunset !== null) return (sunrise + sunset) / 2;
  return sunrise ?? sunset;
}

/**
 * Shifts a festival's published (Delhi-reference) muhurat window by the delta between the
 * user's local anchor event (sunrise/sunset/moonrise) and Delhi's, for the anchor type the
 * muhurat is pegged to. Returns null when neither side has the anchor data (e.g. geolocation
 * not granted yet).
 *
 * ponytail: approximates every muhurat type as one linear shift off today's sunrise/sunset/
 * moonrise delta rather than a true per-tithi-boundary recomputation (needs the swiss-ephemeris
 * tithi transition instant, not available client-side). "midnight" averages today's sunrise+
 * sunset deltas instead of fetching tomorrow's actual sunrise. Moonrise-anchored windows (Karwa
 * Chauth) vary more per location than sun events, so this is the least precise case — fine as a
 * "your timing differs slightly" indicator, not for religious precision. Upgrade path: a
 * server-side per-muhurat endpoint computing the real tithi-transition instant per location, if
 * this ever needs to be authoritative.
 */
export function adjustFestivalMuhurat(
  muhurat: { start: string; end: string; anchor?: MuhuratAnchor },
  refData: AnchorSource,
  userData: AnchorSource,
): { start: string; end: string } | null {
  const delta = anchorDeltaMinutes(muhurat.anchor ?? "sunset", refData, userData);
  if (delta === null) return null;
  return {
    start: minutesToTime(timeToMinutes(muhurat.start) + delta),
    end: minutesToTime(timeToMinutes(muhurat.end) + delta),
  };
}
