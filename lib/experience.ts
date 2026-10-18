/**
 * The two looks, and the rule for changing between them (switch experience.picker).
 *
 * The first pick has no wait. After it the user has one free change at any time; every later change
 * needs 30 days since the previous one. The server decides all of it: this file only describes the
 * answer and turns it into what the Settings row should say.
 */

export type ExperienceSkin = "CLASSIC_VEDIC" | "MODERN_COSMIC";

export interface ExperienceInfo {
  /** The experience.picker switch. While false the app shows no picker and no setting. */
  enabled: boolean;
  skin: ExperienceSkin | null;
  /** False until the user has chosen once: the app shows the picker. */
  picked: boolean;
  freeChangeLeft: boolean;
  canChange: boolean;
  /** ISO time the next change is allowed; null when allowed now. */
  nextAllowedAt: string | null;
}

export const SKIN_OPTIONS: readonly { skin: ExperienceSkin; emoji: string }[] = [
  { skin: "CLASSIC_VEDIC", emoji: "🇮🇳" },
  { skin: "MODERN_COSMIC", emoji: "🌍" },
];

/** Languages whose speakers are mostly in India: the picker preselects the Classic look for them. */
const INDIAN_LANGUAGES = new Set(["hi", "bn", "mr", "te", "ta", "gu", "kn"]);

/** Which card the picker highlights before the user taps. They always tap to confirm. */
export function suggestedSkin(language: string | null | undefined): ExperienceSkin {
  const base = (language ?? "en").split("-")[0]!.toLowerCase();
  return INDIAN_LANGUAGES.has(base) ? "CLASSIC_VEDIC" : base === "en" ? "CLASSIC_VEDIC" : "MODERN_COSMIC";
}

export function skinToLook(skin: ExperienceSkin | null): "vedic" | "cosmic" {
  return skin === "MODERN_COSMIC" ? "cosmic" : "vedic";
}

export type SwitchRowState =
  | { kind: "free" }
  | { kind: "ready" }
  | { kind: "wait"; nextAllowedAt: Date };

/** What the Settings "Switch experience" row shows. */
export function switchRowState(info: ExperienceInfo): SwitchRowState {
  if (info.canChange) return info.freeChangeLeft ? { kind: "free" } : { kind: "ready" };
  return { kind: "wait", nextAllowedAt: new Date(info.nextAllowedAt ?? Date.now()) };
}

/** True when an ApiError-like value is the "too soon" answer; reads the date the server sent. */
export function cooldownFrom(err: unknown): Date | null {
  const details = (err as { details?: { reason?: string; nextAllowedAt?: string } } | null)?.details;
  if (details?.reason !== "EXPERIENCE_COOLDOWN" || !details.nextAllowedAt) return null;
  const d = new Date(details.nextAllowedAt);
  return Number.isNaN(d.getTime()) ? null : d;
}
