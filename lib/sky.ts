import type { PlaceOfBirth } from "./api";

/**
 * Where the user's sky is: home, or where the device is right now (switch experience.travelPill).
 * The server stores the user's answers; this file decides what to show, from the device zone.
 */

export type SkyMode = "HOME" | "TRAVEL_SYNCED" | "TRAVEL_DISMISSED";

export interface SkyContext {
  /** The experience.travelPill switch. */
  travelPill: boolean;
  /** The experience.nriMode switch. */
  nriMode: boolean;
  homeLocation: PlaceOfBirth | null;
  homeTimezone: string | null;
  skyMode: SkyMode;
  skyDismissedTz: string | null;
  isNri: boolean;
}

export interface SkyContextUpdate {
  homeLocation?: PlaceOfBirth | null;
  homeTimezone?: string;
  skyMode?: SkyMode;
  skyDismissedTz?: string | null;
  isNri?: boolean;
}

/** A zone's one canonical spelling, so "Asia/Calcutta" and "Asia/Kolkata" count as the same place. */
export function canonicalZone(tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: tz }).resolvedOptions().timeZone;
  } catch {
    return tz;
  }
}

export function sameZone(a: string, b: string): boolean {
  return canonicalZone(a) === canonicalZone(b);
}

/** "America/New_York" to "New York": a readable name when only the zone is known. */
export function cityFromZone(tz: string): string {
  const last = tz.split("/").pop() ?? tz;
  return last.replace(/_/g, " ");
}

export type TravelState =
  /** Nothing to show: the switch is off, or the device is at home, or the user said keep home for this zone. */
  | { kind: "none" }
  /** No home zone is known yet: remember this device's zone as home. */
  | { kind: "adopt-home" }
  /** The device is away from home and the user has not answered for this zone. */
  | { kind: "ask"; deviceTz: string }
  /** The user chose to follow the device while away. */
  | { kind: "away" }
  /** The user was following the device and is back home: return to home times. */
  | { kind: "home-again" };

/** What the travel pill should do, given the stored answers and the device's zone right now. */
export function travelState(ctx: SkyContext, deviceTz: string): TravelState {
  if (!ctx.travelPill) return { kind: "none" };
  if (!ctx.homeTimezone) return { kind: "adopt-home" };
  if (sameZone(deviceTz, ctx.homeTimezone)) {
    return ctx.skyMode === "TRAVEL_SYNCED" ? { kind: "home-again" } : { kind: "none" };
  }
  if (ctx.skyMode === "TRAVEL_SYNCED") return { kind: "away" };
  if (ctx.skyMode === "TRAVEL_DISMISSED" && ctx.skyDismissedTz && sameZone(deviceTz, ctx.skyDismissedTz)) {
    return { kind: "none" };
  }
  return { kind: "ask", deviceTz };
}

/**
 * The place Panchang should use in place of the device, or null to use the device as before.
 * Only when the user is away, chose to keep home, and has set a home city.
 */
export function homeOverride(ctx: SkyContext | null, deviceTz: string): PlaceOfBirth | null {
  if (!ctx || !ctx.travelPill || !ctx.homeLocation) return null;
  if (ctx.skyMode !== "TRAVEL_DISMISSED" || !ctx.skyDismissedTz) return null;
  if (sameZone(deviceTz, ctx.homeLocation.tz)) return null;
  return sameZone(deviceTz, ctx.skyDismissedTz) ? ctx.homeLocation : null;
}
