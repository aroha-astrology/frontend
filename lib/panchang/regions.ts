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
