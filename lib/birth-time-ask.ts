import type { User } from "@/lib/api";

/**
 * The one-time "where does your birth time come from?" question (audit M7, switch `home.birthTimeAsk`).
 *
 * Readers who typed a birth time but never rated it have `birthTimeAccuracy: null`, and chat, voice and
 * reports narrate that as exact. Answering saves the rating through the normal profile update, and a
 * rated profile is never asked again; "Not now" only waits two weeks.
 */
export const BIRTH_TIME_ASK_FEATURE = "home.birthTimeAsk";
export const SNOOZE_KEY = "aroha:birthTimeAskSnoozedUntil:v1";
export const SNOOZE_MS = 14 * 24 * 3600 * 1000;

export type BirthTimeAnswer = "record" | "family" | "unsure";

/** What each answer saves. Same accuracy and source values the Profile screen and server already accept. */
export const ANSWER_BODY: Record<
  BirthTimeAnswer,
  { birthTimeAccuracy: "exact" | "approximate" | "unknown"; birthTimeSource: "birth_certificate" | "family_memory" | "unknown" }
> = {
  record: { birthTimeAccuracy: "exact", birthTimeSource: "birth_certificate" },
  family: { birthTimeAccuracy: "approximate", birthTimeSource: "family_memory" },
  unsure: { birthTimeAccuracy: "unknown", birthTimeSource: "unknown" },
};

export function shouldAskBirthTime(
  user: Pick<User, "profileCompletedAt" | "timeOfBirth" | "birthTimeAccuracy"> | null,
  opts: { enabled: boolean; snoozedUntil: number | null; now: number },
): boolean {
  if (!opts.enabled || !user) return false;
  if (!user.profileCompletedAt || !user.timeOfBirth) return false;
  if (user.birthTimeAccuracy !== null) return false;
  return opts.snoozedUntil === null || opts.snoozedUntil <= opts.now;
}

export interface AskTarget {
  /** 'primary' for the account owner, else the saved profile's id. */
  id: string;
  /** The saved profile's name; null for the owner. */
  name: string | null;
  isSelf: boolean;
}

/**
 * Whose birth time to ask about: the active profile when it is a saved family profile with a typed
 * time and no rating, otherwise the account owner under the same rule as `shouldAskBirthTime`. The
 * "Not now" wait is per target, so snoozing one person's question never hides another's.
 */
export function birthTimeAskTarget(
  user: Pick<User, "profileCompletedAt" | "timeOfBirth" | "birthTimeAccuracy"> | null,
  active: { id: string; isPrimary: boolean; displayName: string | null; timeOfBirth: string | null; birthTimeAccuracy: User["birthTimeAccuracy"] } | null,
  opts: { enabled: boolean },
): AskTarget | null {
  if (!opts.enabled || !user) return null;
  if (active && !active.isPrimary) {
    if (!active.timeOfBirth || active.birthTimeAccuracy !== null) return null;
    return { id: active.id, name: active.displayName, isSelf: false };
  }
  return shouldAskBirthTime(user, { enabled: true, snoozedUntil: null, now: 0 })
    ? { id: "primary", name: null, isSelf: true }
    : null;
}
