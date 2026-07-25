/**
 * sessionStorage key used to hand a pre-composed first message to the AI
 * chat page from another page (e.g. "Ask an Astrologer" after a
 * compatibility check) — set it, then navigate to /ai-chat, which reads
 * and clears it on mount.
 *
 * Payload shape: { message: string; compareProfileId?: string }
 *   - message: the pre-composed first chat message text
 *   - compareProfileId: optional birth_profiles row id to ground the AI in
 *     a real synastry reading via the backend's buildSecondChartFacts feature
 */
export const CHAT_PENDING_CONTEXT_KEY = "aroha:chat_pending_context";

export interface ChatPendingPayload {
  message: string;
  compareProfileId?: string;
}
