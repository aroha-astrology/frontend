import { registerPlugin } from "@capacitor/core";
import { isNativeAndroid } from "./play-billing";

/** Where the Play listing lives — shared with lib/referral.ts's share links.
 * There's no App Store listing yet. */
export const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.aroha.astrology";

/**
 * Local native plugin registered in mobile/android's MainActivity — not an
 * npm package. Only usable when Capacitor.isNativePlatform() is true.
 */
const AppReview = registerPlugin<{ requestReview(): Promise<void> }>("AppReview");

const ASKED_KEY = "aroha:reviewAsked:v1";
// Play's own quota is roughly monthly and undocumented; staying well clear of it
// means the one time the card does show lands on a user who's had months of use.
const COOLDOWN_MS = 120 * 24 * 60 * 60 * 1000;

const GOOD_REPLIES_KEY = "aroha:goodChatReplies:v1";

const ASK_AFTER_KEY = "aroha:feedbackAskAfter:v1";
/** Long enough to actually read the report we just generated before we interrupt. */
const REPORT_READ_MS = 3 * 60 * 1000;
const CHAT_REPLIES_BEFORE_ASKING = 3;

/**
 * Counts real AI chat replies (ones that actually produced text) toward the
 * review-prompt milestone — persisted in localStorage rather than in-memory,
 * so it accumulates across separate visits/days instead of resetting on every
 * page refresh. Most chat sessions are only 1-2 messages long, so requiring 5
 * in one sitting almost never fired in practice; this makes "5 good replies,
 * ever" the actual bar. Returns the new cumulative count; the caller checks
 * for the exact milestone value (see ChatConversation.tsx) so the review
 * prompt only fires once as the count crosses it, not on every reply after.
 */
export function recordGoodChatReply(): number {
  try {
    const count = Number(window.localStorage.getItem(GOOD_REPLIES_KEY) ?? 0) + 1;
    window.localStorage.setItem(GOOD_REPLIES_KEY, String(count));
    return count;
  } catch {
    // localStorage blocked/unavailable — never claim a milestone we can't trust.
    return 0;
  }
}

/**
 * A finished report is the other moment worth asking for a rating on — but not
 * while the user is still reading it. Stamps the earliest time FeedbackPrompt
 * may ask; it then fires on the first navigation after that. First report only:
 * a later one must never push the ask further out.
 *
 * Shares this file because it shares GOOD_REPLIES_KEY, NOT because it chains to
 * the Play card below — the two stay independent (see FeedbackSheet's comment).
 */
export function markReportGeneratedForReview(): void {
  try {
    if (window.localStorage.getItem(ASK_AFTER_KEY)) return;
    window.localStorage.setItem(ASK_AFTER_KEY, String(Date.now() + REPORT_READ_MS));
  } catch {
    // localStorage blocked — no stamp, so we simply never ask off this trigger.
  }
}

/**
 * True once the user has had 3 real chat answers, or generated a report and had
 * time to read it. Read-only: FeedbackPrompt polls this on navigation.
 */
export function feedbackAskDue(): boolean {
  try {
    if (Number(window.localStorage.getItem(GOOD_REPLIES_KEY) ?? 0) >= CHAT_REPLIES_BEFORE_ASKING) return true;
    const askAfter = Number(window.localStorage.getItem(ASK_AFTER_KEY) ?? 0);
    return askAfter > 0 && Date.now() >= askAfter;
  } catch {
    return false;
  }
}

/**
 * Show Google's in-app review card, at most once per cooldown, on native Android
 * only. Fire-and-forget by design: Google never reports the star count, whether a
 * review was submitted, or even whether the card appeared, so there is nothing
 * meaningful to return and nothing a caller may branch on.
 */
export async function maybeRequestReview(): Promise<void> {
  try {
    if (!(await isNativeAndroid())) return;

    const last = Number(window.localStorage.getItem(ASKED_KEY) ?? 0);
    if (Number.isFinite(last) && Date.now() - last < COOLDOWN_MS) return;
    // Stamped before the call, not after: a rejection still burns the attempt,
    // otherwise a device where the flow is permanently unavailable would retry
    // at every single milestone.
    window.localStorage.setItem(ASKED_KEY, String(Date.now()));

    await AppReview.requestReview();
  } catch {
    // Plugin missing (web/iOS build), localStorage blocked, or Play declined the
    // flow — all non-events for the user.
  }
}
