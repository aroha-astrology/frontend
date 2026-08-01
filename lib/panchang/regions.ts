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

interface NativeDateTithi {
  name: string;
  paksha: string;
}

interface NativeDateRegionalMonth {
  calendar: string;
  monthSystem: string;
  monthName: string;
  year: number;
  isAdhikMaas?: boolean;
}

/**
 * Combines the day's tithi/paksha with the selected region's month + era
 * year into one native-calendar date line, e.g. "Krishna Trayodashi,
 * Chaitra, Vikram Samvat 2082". `fixed_solar` regions (Nanakshahi) have no
 * tithi/paksha concept, so they degrade to just "{month}, {calendar} {year}".
 * Returns null if the inputs needed for the region aren't loaded yet.
 */
export function formatNativeDate(
  tithi: NativeDateTithi | null | undefined,
  regionalMonth: NativeDateRegionalMonth | null | undefined,
): string | null {
  if (!regionalMonth) return null;
  const monthLabel = regionalMonth.isAdhikMaas ? `Adhika ${regionalMonth.monthName}` : regionalMonth.monthName;
  if (regionalMonth.monthSystem === "fixed_solar") {
    return `${monthLabel}, ${regionalMonth.calendar} ${regionalMonth.year}`;
  }
  if (!tithi) return null;
  return `${tithi.paksha} ${tithi.name}, ${monthLabel}, ${regionalMonth.calendar} ${regionalMonth.year}`;
}

/**
 * The "date" to show under a Gregorian day number in the monthly calendar
 * grid: the tithi's day-within-paksha (1-15, e.g. "Shukla 5" / "Krishna
 * 10") — the number every printed Indian calendar shows regardless of which
 * regional month-naming convention is in use, since tithi is a Panchang-wide
 * concept shared by every lunisolar and solar region alike. `tithiNumber`
 * runs 1-30 across the full lunar month (see classifyTithiForCalendar in
 * astro.service.ts); Krishna paksha is the back half (16-30), so it's
 * shifted down to the same 1-15 range as Shukla.
 *
 * Not shown for Punjab (Nanakshahi) — that calendar has no tithi/lunar
 * concept at all (see formatNativeDate's fixed_solar branch above), so
 * showing a tithi number there would be a fabricated, meaningless figure.
 */
export function tithiPakshaDayNumber(tithiNumber: number, paksha: string): number {
  return paksha === "Krishna" ? tithiNumber - 15 : tithiNumber;
}
