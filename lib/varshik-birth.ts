import type { PlaceOfBirth, Profile, User } from "@/lib/api";

/**
 * What Varshik Rashifal needs before it can be bought, read the same way the server reads it
 * (backend src/modules/reports/varshik-purchase.ts + lib/intelligence/birth-time-confidence.ts):
 *   - a birth time the reader says is exact. A remembered ("approximate") time and a time saved before
 *     we asked (null) both count as not confirmed; a part-of-day window ("unknown") is not a time at all.
 *   - a birth place with coordinates and a time zone.
 * The purchase sheet asks for exactly what is missing, so the reader never meets a dead "try again".
 */
export type BirthGap = "time_missing" | "time_window" | "time_unconfirmed" | "place_missing";

type BirthFields = Pick<Profile, "timeOfBirth" | "birthTimeAccuracy" | "placeOfBirth">;

export function placeIsUsable(place: PlaceOfBirth | null | undefined): boolean {
  return (
    !!place &&
    Number.isFinite(place.lat) &&
    Number.isFinite(place.lon) &&
    Math.abs(place.lat) <= 90 &&
    Math.abs(place.lon) <= 180 &&
    typeof place.tz === "string" &&
    place.tz.length > 0
  );
}

/** Every gap, time first (the order the reader fills them in). Empty when the report can be bought. */
export function varshikBirthGaps(p: BirthFields | null | undefined): BirthGap[] {
  if (!p) return [];
  const gaps: BirthGap[] = [];
  if (!p.timeOfBirth) gaps.push("time_missing");
  else if (p.birthTimeAccuracy === "unknown") gaps.push("time_window");
  else if (p.birthTimeAccuracy !== "exact") gaps.push("time_unconfirmed");
  if (!placeIsUsable(p.placeOfBirth)) gaps.push("place_missing");
  return gaps;
}

/**
 * The birth fields of whoever the report is for. The account owner's come from the account itself
 * (GET /v1/me), which always carries birthTimeAccuracy: the profile list did not send it before
 * 2026-11-10, so reading the owner from there kept "Yes, it's exact" looking unconfirmed and Buy shut.
 * A family profile's come from the profile list (a missing accuracy reads as not confirmed, as on the server).
 */
export function birthFieldsOf(activeProfile: Profile | null, user: User | null): BirthFields | null {
  if (activeProfile && !activeProfile.isPrimary) {
    return {
      timeOfBirth: activeProfile.timeOfBirth,
      birthTimeAccuracy: activeProfile.birthTimeAccuracy ?? null,
      placeOfBirth: activeProfile.placeOfBirth,
    };
  }
  if (!user) return activeProfile;
  return { timeOfBirth: user.timeOfBirth, birthTimeAccuracy: user.birthTimeAccuracy, placeOfBirth: user.placeOfBirth };
}

/** The server's refusal messages a purchase sheet answers with a birth-details step instead of "try again". */
export const BIRTH_REFUSALS = ["BIRTH_TIME_NOT_CONFIRMED", "BIRTH_PLACE_MISSING", "BIRTH_DETAILS_MISSING"] as const;

// ── The half-filled purchase sheet ───────────────────────────────────────────
// Kept while the reader goes to check their birth time (or anywhere else), so coming back never means
// answering again. One draft per report and profile; it is dropped after a purchase and after a week.

export interface PurchaseDraft {
  tier: string | null;
  answers: Record<string, string>;
  savedAt: number;
}

const DRAFT_PREFIX = "aroha:purchaseDraft:v1:";
const RESUME_KEY = "aroha:purchaseResume:v1";
const DRAFT_MAX_AGE_MS = 7 * 24 * 3600 * 1000;

const draftKey = (reportKey: string, profileId: string) => `${DRAFT_PREFIX}${reportKey}:${profileId}`;

export function readDraft(reportKey: string, profileId: string, now = Date.now()): PurchaseDraft | null {
  try {
    const raw = window.localStorage.getItem(draftKey(reportKey, profileId));
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<PurchaseDraft>;
    if (typeof d.savedAt !== "number" || now - d.savedAt > DRAFT_MAX_AGE_MS) return null;
    const answers: Record<string, string> = {};
    for (const [k, v] of Object.entries(d.answers ?? {})) if (typeof v === "string") answers[k] = v;
    return { tier: typeof d.tier === "string" ? d.tier : null, answers, savedAt: d.savedAt };
  } catch {
    return null;
  }
}

export function writeDraft(reportKey: string, profileId: string, draft: Omit<PurchaseDraft, "savedAt">): void {
  try {
    window.localStorage.setItem(draftKey(reportKey, profileId), JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch {
    // Private mode or full storage: the sheet still works, it just cannot remember.
  }
}

export function clearDraft(reportKey: string, profileId: string): void {
  try {
    window.localStorage.removeItem(draftKey(reportKey, profileId));
  } catch {
    // ignore
  }
}

/** Set when the reader leaves the sheet for the birth time check: the Reports screen reopens that sheet on return. */
export function markResume(reportKey: string): void {
  try {
    window.localStorage.setItem(RESUME_KEY, JSON.stringify({ reportKey, at: Date.now() }));
  } catch {
    // ignore
  }
}

/** The report whose sheet should reopen (read once: it is cleared here). Older than a day is ignored. */
export function takeResume(now = Date.now()): string | null {
  try {
    const raw = window.localStorage.getItem(RESUME_KEY);
    window.localStorage.removeItem(RESUME_KEY);
    if (!raw) return null;
    const r = JSON.parse(raw) as { reportKey?: unknown; at?: unknown };
    if (typeof r.reportKey !== "string" || typeof r.at !== "number" || now - r.at > 24 * 3600 * 1000) return null;
    return r.reportKey;
  } catch {
    return null;
  }
}
