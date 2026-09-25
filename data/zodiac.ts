import type { TFunction } from "i18next";

export interface ZodiacSign {
  /** Sign index matching the backend (0 = Aries, 11 = Pisces). */
  index: number;
  /** Unicode zodiac symbol. */
  symbol: string;
  /** English name. */
  name: string;
  /** Vedic (sidereal) name. */
  vedicName: string;
  /** The everyday Hindi name, written in English letters (Aquarius → "Kumbh"). */
  hindiName: string;
  /** Approximate Western date range. */
  dates: string;
  /** Ruling planet. */
  ruler: string;
  /** Element. */
  element: "Fire" | "Earth" | "Air" | "Water";
}

export const zodiac: ZodiacSign[] = [
  { index: 0, symbol: "♈", name: "Aries", vedicName: "Mesha", hindiName: "Mesh", dates: "Mar 21 – Apr 19", ruler: "Mars", element: "Fire" },
  { index: 1, symbol: "♉", name: "Taurus", vedicName: "Vrishabha", hindiName: "Vrishabh", dates: "Apr 20 – May 20", ruler: "Venus", element: "Earth" },
  { index: 2, symbol: "♊", name: "Gemini", vedicName: "Mithuna", hindiName: "Mithun", dates: "May 21 – Jun 20", ruler: "Mercury", element: "Air" },
  { index: 3, symbol: "♋", name: "Cancer", vedicName: "Karka", hindiName: "Kark", dates: "Jun 21 – Jul 22", ruler: "Moon", element: "Water" },
  { index: 4, symbol: "♌", name: "Leo", vedicName: "Simha", hindiName: "Singh", dates: "Jul 23 – Aug 22", ruler: "Sun", element: "Fire" },
  { index: 5, symbol: "♍", name: "Virgo", vedicName: "Kanya", hindiName: "Kanya", dates: "Aug 23 – Sep 22", ruler: "Mercury", element: "Earth" },
  { index: 6, symbol: "♎", name: "Libra", vedicName: "Tula", hindiName: "Tula", dates: "Sep 23 – Oct 22", ruler: "Venus", element: "Air" },
  { index: 7, symbol: "♏", name: "Scorpio", vedicName: "Vrishchika", hindiName: "Vrishchik", dates: "Oct 23 – Nov 21", ruler: "Mars", element: "Water" },
  { index: 8, symbol: "♐", name: "Sagittarius", vedicName: "Dhanu", hindiName: "Dhanu", dates: "Nov 22 – Dec 21", ruler: "Jupiter", element: "Fire" },
  { index: 9, symbol: "♑", name: "Capricorn", vedicName: "Makara", hindiName: "Makar", dates: "Dec 22 – Jan 19", ruler: "Saturn", element: "Earth" },
  { index: 10, symbol: "♒", name: "Aquarius", vedicName: "Kumbha", hindiName: "Kumbh", dates: "Jan 20 – Feb 18", ruler: "Saturn", element: "Air" },
  { index: 11, symbol: "♓", name: "Pisces", vedicName: "Meena", hindiName: "Meen", dates: "Feb 19 – Mar 20", ruler: "Jupiter", element: "Water" },
];

/** Localizes a zodiac sign's English name (e.g. "Aries") via the `zodiac.signs.*` i18n keys. */
export function zodiacSignLabel(t: TFunction, englishName: string): string {
  return t(`zodiac.signs.${englishName.toLowerCase()}`, { defaultValue: englishName });
}

/** The sign's everyday Hindi name in English letters ("Aquarius" → "Kumbh"), or null for an unknown name. */
export function zodiacHindiName(englishName: string): string | null {
  const lower = englishName.toLowerCase();
  return zodiac.find((z) => z.name.toLowerCase() === lower)?.hindiName ?? null;
}
