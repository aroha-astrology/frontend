/** Admin dashboard names for the share targets a story can be sent to. */
export const SHARE_CHANNEL_NAMES: Record<string, string> = {
  whatsappStatus: "WhatsApp Status",
  whatsapp: "WhatsApp",
  instagramStory: "Instagram Story",
  instagram: "Instagram",
  x: "X",
  sms: "SMS",
  copy: "Copy",
  system: "More",
};

export interface ChannelCount {
  name: string;
  count: number;
}

/** The channels that were used, most used first. */
export function sortedChannels(channels: Record<string, number>): ChannelCount[] {
  return Object.entries(channels)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => ({ name: SHARE_CHANNEL_NAMES[key] ?? key, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Share clicks with where they went: "0", "12 (WhatsApp)", "34 (WhatsApp 20, Instagram Story 8, X 6)". */
export function formatShares(total: number, channels: Record<string, number>): string {
  const list = sortedChannels(channels);
  if (list.length === 0) return String(total);
  if (list.length === 1) return `${total} (${list[0]!.name})`;
  return `${total} (${list.map((c) => `${c.name} ${c.count}`).join(", ")})`;
}
