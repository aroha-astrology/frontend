export type RegionId = "north" | "south" | "west" | "east";

export const REGION_OPTIONS: { value: RegionId; label: string }[] = [
  { value: "north", label: "North" },
  { value: "south", label: "South" },
  { value: "west", label: "West" },
  { value: "east", label: "East" },
];

export interface RegionMeta {
  id: RegionId;
  label: string;
  calendarName: string; // 'Vikram Samvat', 'Bengali San', ...
  adhikMaasName: string; // localised Adhik Maas / Mol Maas name
}

export const REGION_META: Record<RegionId, RegionMeta> = {
  north: { id: "north", label: "North", calendarName: "Vikram Samvat", adhikMaasName: "Adhik Maas" },
  south: { id: "south", label: "South", calendarName: "Shalivahana Shaka", adhikMaasName: "Adhika Masam" },
  west: { id: "west", label: "West", calendarName: "Shalivahana Shaka", adhikMaasName: "Adhik Maas" },
  east: { id: "east", label: "East", calendarName: "Bengali San", adhikMaasName: "Mol Maas" },
};
