/**
 * sessionStorage key used to hand a pre-composed first message to the AI
 * chat page from another page (e.g. "Ask an Astrologer" after a
 * compatibility check) — set it, then navigate to /ai-chat, which reads
 * and clears it on mount.
 */
export const CHAT_PENDING_CONTEXT_KEY = "aroha:chat_pending_context";
