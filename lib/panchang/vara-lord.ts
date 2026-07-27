// Classical Vedic weekday → ruling planet (Vara / Vaara lord) mapping.
//
// Each day of the week is ruled by one of the 7 classical grahas (the
// "Chaldean" visible bodies — Sun through Saturn, no Rahu/Ketu). This is the
// same mapping used to name the weekdays themselves in Sanskrit:
//   Sunday    (Ravivara)    → Sun
//   Monday    (Somavara)    → Moon
//   Tuesday   (Mangalvara)  → Mars
//   Wednesday (Budhavara)   → Mercury
//   Thursday  (Guruvara)    → Jupiter
//   Friday    (Shukravara)  → Venus
//   Saturday  (Shanivara)   → Saturn
//
// Keyed by JS `Date#getDay()` (0 = Sunday ... 6 = Saturday) so callers can
// pass either a day-of-week number or a Date straight through.

import type { PlanetId } from "@/components/3d/planet-registry";

export const VARA_LORDS: Record<number, PlanetId> = {
  0: "sun",
  1: "moon",
  2: "mars",
  3: "mercury",
  4: "jupiter",
  5: "venus",
  6: "saturn",
};

/** Returns the classical ruling planet (Vara lord) for a day-of-week number (0=Sunday..6=Saturday). */
export function getVaraLord(dayOfWeek: number): PlanetId;
/** Returns the classical ruling planet (Vara lord) for the weekday of a Date, in the environment's local time. */
export function getVaraLord(date: Date): PlanetId;
export function getVaraLord(input: number | Date): PlanetId {
  const dayOfWeek = input instanceof Date ? input.getDay() : input;
  const lord = VARA_LORDS[dayOfWeek];
  if (!lord) {
    throw new Error(`getVaraLord: invalid day-of-week "${dayOfWeek}" (expected 0-6)`);
  }
  return lord;
}
