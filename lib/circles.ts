/**
 * Cosmic Circles (switches circles.*): the people you keep close, each with a daily pulse.
 * The server scores the pulse (Bonds compatibility plus the Moon of the day); this file is the
 * shapes and the small rules the screens share.
 */

export type PulseTone = "glow" | "steady" | "quiet" | "care";

export interface CircleMember {
  id: string;
  kind: "profile" | "linked";
  profileId: string | null;
  name: string;
  relationship: string | null;
  /** Null while the person's chart cannot be read yet. */
  pulse: { score: number; tone: PulseTone } | null;
}

export interface Circle {
  localDate: string;
  max: number;
  members: CircleMember[];
  openInvites: number;
}

export interface CircleInvite {
  code: string;
  path: string;
  expiresAt: string;
}

export interface InvitePreview {
  inviterName: string;
  state: "open" | "used" | "expired";
}

/** The Family Shield: the protection shloka the circle links to (slug in the Shlokas library). */
export const FAMILY_SHIELD_SLUG = "rama-raksha-stotram";

/** An invite code: 10 characters, no look-alikes (0/O, 1/I/L). Same pattern as the server. */
export const INVITE_CODE_PATTERN = /^[A-HJKMNP-Z2-9]{10}$/;

/** The code in a `/circle/invite/<code>` path or a full link, or null. */
export function inviteCodeFrom(text: string): string | null {
  const match = /\/circle\/invite\/([A-Za-z0-9]+)/.exec(text);
  const code = (match ? match[1]! : text.trim()).toUpperCase();
  return INVITE_CODE_PATTERN.test(code) ? code : null;
}

/** The full link to share, on the site the app is served from. */
export function inviteLink(origin: string, code: string): string {
  return `${origin.replace(/\/+$/, "")}/circle/invite/${code}`;
}

/** The profiles that can still be added: saved profiles not already in the circle. */
export function addableProfiles<P extends { id: string }>(profiles: readonly P[], circle: Circle | null): P[] {
  const taken = new Set((circle?.members ?? []).map((m) => m.profileId).filter(Boolean));
  return profiles.filter((p) => !taken.has(p.id));
}

/** The server's reason codes for a refused add or accept, as the keys the app words. */
export type CircleProblem =
  | "CIRCLE_FULL"
  | "ALREADY_IN_CIRCLE"
  | "THATS_YOU"
  | "INVITE_USED"
  | "INVITE_EXPIRED"
  | "TOO_MANY_OPEN_INVITES";

const PROBLEMS: readonly string[] = [
  "CIRCLE_FULL",
  "ALREADY_IN_CIRCLE",
  "THATS_YOU",
  "INVITE_USED",
  "INVITE_EXPIRED",
  "TOO_MANY_OPEN_INVITES",
];

export function problemOf(message: string | undefined | null): CircleProblem | null {
  return message && PROBLEMS.includes(message) ? (message as CircleProblem) : null;
}

/** The member whose day is brightest, to lead the Home card. */
export function brightestMember(circle: Circle): CircleMember | null {
  const scored = circle.members.filter((m): m is CircleMember & { pulse: NonNullable<CircleMember["pulse"]> } => m.pulse !== null);
  if (scored.length === 0) return null;
  return scored.reduce((best, m) => (m.pulse.score > best.pulse.score ? m : best));
}

/* -------------------------------------------------------------------------- */
/* An invite waiting for the reader to sign in or finish setting up              */
/* -------------------------------------------------------------------------- */

const PENDING_KEY = "aroha:pendingCircleInvite:v1";

/** Keep an invite code until the reader has an account to accept it with. */
export function storePendingCircleInvite(code: string): void {
  if (typeof window === "undefined" || !INVITE_CODE_PATTERN.test(code)) return;
  try {
    window.localStorage.setItem(PENDING_KEY, code);
  } catch {
    /* storage blocked: the reader can open the link again */
  }
}

export function getPendingCircleInvite(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const code = window.localStorage.getItem(PENDING_KEY);
    return code && INVITE_CODE_PATTERN.test(code) ? code : null;
  } catch {
    return null;
  }
}

export function clearPendingCircleInvite(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PENDING_KEY);
  } catch {
    /* nothing to clear */
  }
}

/**
 * The Play Store link a circle invite sends a friend who has no app yet. Play hands `referrer` back on
 * the first launch (lib/install-referrer.ts), which carries only the opaque invite code.
 */
export function circleInstallUrl(playStoreUrl: string, code: string): string {
  return `${playStoreUrl}&referrer=${encodeURIComponent(`utm_source=circle&circle=${code}`)}`;
}

/** The invite code inside a raw Play install referrer string, or null. */
export function parseCircleReferrer(referrer: string): string | null {
  const code = new URLSearchParams(referrer).get("circle")?.trim().toUpperCase() ?? "";
  return INVITE_CODE_PATTERN.test(code) ? code : null;
}
