/**
 * Baba Ji memory (switches memory.*): what the guide remembers, the free first reply after a check-in,
 * and the "Sharpen your birth time" chip. The server decides everything; this file is the shapes and
 * the small rules the screens share.
 */

export interface VaultEntry {
  id: string;
  text: string;
  /** True for a timing the guide itself gave the reader ("PREVIOUSLY TOLD THEM ..."). */
  toldByGuide: boolean;
  question: string | null;
  eventKind: string | null;
  /** YYYY-MM-DD, the reader's own calendar day. */
  eventDate: string | null;
  status: "ACTIVE" | "DONE" | "DISMISSED";
  /** The reader can say "it happened" (the day is today or past, and it is still open). */
  canConfirm: boolean;
  confirmed: boolean;
  createdAt: string;
}

export interface MemoryVault {
  items: VaultEntry[];
  freeReply: boolean;
}

export interface MemorySummary {
  freeReply: boolean;
  confirmedEvents: number;
  suggestRectify: boolean;
}

export const EVENT_KINDS = ["interview", "exam", "result", "travel", "move", "launch", "wedding", "meeting", "other"] as const;

/** The i18n key for an event kind; an unknown kind reads as a plain "event". */
export function kindKey(kind: string | null): string {
  return `memory.kind.${kind && (EVENT_KINDS as readonly string[]).includes(kind) ? kind : "other"}`;
}

/** Dated things first (soonest or most recent day first), then everything else, newest first. */
export function splitVault(items: VaultEntry[]): { events: VaultEntry[]; facts: VaultEntry[] } {
  const events = items.filter((i) => i.eventDate).sort((a, b) => (b.eventDate! > a.eventDate! ? 1 : -1));
  const facts = items.filter((i) => !i.eventDate).sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  return { events, facts };
}

/** "5 Nov 2026" in the reader's language, from a YYYY-MM-DD day (read as that day, not shifted by a zone). */
export function formatEventDate(day: string, language: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return day;
  return d.toLocaleDateString(language, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
