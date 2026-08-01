export type RegionId =
  | "north"
  | "south"
  | "west"
  | "east"
  | "gujarat"
  | "odisha"
  | "assam"
  | "tamil"
  | "malayalam"
  | "punjab"
  | "kannada";

export const REGION_OPTIONS: { value: RegionId; label: string }[] = [
  { value: "north", label: "Hindi / Bihari" },
  { value: "west", label: "Marathi" },
  { value: "gujarat", label: "Gujarati" },
  { value: "east", label: "Bengali" },
  { value: "assam", label: "Assamese" },
  { value: "odisha", label: "Odia" },
  { value: "south", label: "Telugu" },
  { value: "kannada", label: "Kannada" },
  { value: "tamil", label: "Tamil" },
  { value: "malayalam", label: "Malayalam" },
  { value: "punjab", label: "Punjabi" },
];

export interface RegionMeta {
  id: RegionId;
  label: string;
  calendarName: string; // 'Vikram Samvat', 'Bengali San', 'Kollam Era', 'Nanakshahi', ...
  /** Localised Adhik Maas / intercalary-month name — omitted for regions with no direct equivalent term (fixed-solar Nanakshahi). */
  adhikMaasName?: string;
}

export const REGION_META: Record<RegionId, RegionMeta> = {
  north: { id: "north", label: "Hindi / Bihari", calendarName: "Vikram Samvat", adhikMaasName: "Adhik Maas" },
  south: { id: "south", label: "Telugu", calendarName: "Shalivahana Shaka", adhikMaasName: "Adhika Masam" },
  kannada: { id: "kannada", label: "Kannada", calendarName: "Shalivahana Shaka", adhikMaasName: "Adhika Masa" },
  west: { id: "west", label: "Marathi", calendarName: "Shalivahana Shaka", adhikMaasName: "Adhik Maas" },
  east: { id: "east", label: "Bengali", calendarName: "Bengali San", adhikMaasName: "Mol Maas" },
  gujarat: { id: "gujarat", label: "Gujarati", calendarName: "Vikram Samvat", adhikMaasName: "Adhik Maas" },
  odisha: { id: "odisha", label: "Odia", calendarName: "Shalivahana Shaka" },
  assam: { id: "assam", label: "Assamese", calendarName: "Bengali San" },
  tamil: { id: "tamil", label: "Tamil", calendarName: "Shalivahana Shaka" },
  malayalam: { id: "malayalam", label: "Malayalam", calendarName: "Kollam Era" },
  punjab: { id: "punjab", label: "Punjabi", calendarName: "Nanakshahi" },
};

/**
 * The "date" to show under a Gregorian day number in the monthly calendar
 * grid for lunisolar (purnimanta/amanta) regions: the tithi's day-within-
 * paksha (1-15, e.g. "Shukla 5" / "Krishna 10") — the number every printed
 * Indian calendar shows for these regions, since tithi is a Panchang-wide
 * concept shared identically across all of them (only the month NAME
 * differs by region, shown in the header). `tithiNumber` runs 1-30 across
 * the full lunar month (see classifyTithiForCalendar in astro.service.ts);
 * Krishna paksha is the back half (16-30), so it's shifted down to the same
 * 1-15 range as Shukla.
 *
 * Solar and fixed_solar (Nanakshahi) regions instead use their own
 * `dayOfMonth` from the day's regionalMonths entry (see
 * MonthlyPanchangCalendar.tsx) — that's genuinely region-specific and
 * changes when the picker changes region, unlike tithi.
 */
export function tithiPakshaDayNumber(tithiNumber: number, paksha: string): number {
  return paksha === "Krishna" ? tithiNumber - 15 : tithiNumber;
}
