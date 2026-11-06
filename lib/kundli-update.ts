import type { User } from "@/lib/api";

/**
 * The "Your Kundli needs an update" notice on Home (audit Sprint 16). The server says, on the active
 * profile, whether its saved Kundli was built by an older calculation (`kundliOutdated`) or that old
 * chart is being rebuilt right now (`kundliUpdating`). Opening Kundli starts the rebuild. "Later" hides
 * the notice for a day on this device only.
 */
export const KUNDLI_UPDATE_SNOOZE_KEY = "aroha:kundliUpdateSnoozedUntil:v1";
export const KUNDLI_UPDATE_SNOOZE_MS = 24 * 3600 * 1000;

export type KundliUpdateView = "outdated" | "updating";

export function kundliUpdateView(
  user: Partial<Pick<User, "kundliOutdated" | "kundliUpdating">> | null,
  opts: { pathname: string | null; snoozedUntil: number | null; now: number },
): KundliUpdateView | null {
  if (!user || opts.pathname !== "/") return null;
  if (opts.snoozedUntil !== null && opts.snoozedUntil > opts.now) return null;
  if (user.kundliUpdating) return "updating";
  if (user.kundliOutdated) return "outdated";
  return null;
}
