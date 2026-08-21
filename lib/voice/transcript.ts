/**
 * Assembles fragmentary Gemini Live transcription events into whole turns.
 *
 * `inputTranscription`/`outputTranscription` (see gemini-live-client.ts) arrive
 * as a stream of small text fragments per role, not one message per turn. A
 * turn is complete when the role flips — the model doesn't start replying
 * until the user stops talking, so "role changed" is turn-complete in
 * practice. Pure and DOM-free on purpose, so this is testable without a
 * socket or an AudioContext (see the frontend test-suite note in
 * gemini-live-client.ts's module doc — nothing in this file needs jsdom).
 */

export interface TranscriptTurn {
  role: "user" | "assistant";
  content: string;
}

/** Matches ChatHistoryTurnSchema's content cap on the backend (astro.schemas.ts). */
const MAX_TURN_CHARS = 8000;

/**
 * Defensive ceiling on turn count, not a real limit — a 3-minute call rarely
 * exceeds a dozen turns. Keeps a pathological session (rapid barge-in flapping
 * the role back and forth) from producing a body big enough to trip the
 * backend's own `.max(60)` and fail the whole `/end` call over it.
 */
const MAX_TURNS = 60;

export class TranscriptBuffer {
  private turns: TranscriptTurn[] = [];
  private pendingRole: TranscriptTurn["role"] | null = null;
  private pending = "";

  /** `role: "model"` maps to `"assistant"` — matches chat's ChatHistoryTurn roles. */
  append(text: string, role: "user" | "model"): void {
    const mapped: TranscriptTurn["role"] = role === "model" ? "assistant" : "user";
    if (this.pendingRole !== null && this.pendingRole !== mapped) this.flush();
    this.pendingRole = mapped;
    this.pending += text;
  }

  private flush(): void {
    const content = this.pending.trim().slice(0, MAX_TURN_CHARS);
    if (content && this.pendingRole) this.turns.push({ role: this.pendingRole, content });
    this.pending = "";
    this.pendingRole = null;
  }

  /**
   * Flushes whatever turn is still in progress and returns the whole call.
   * Safe to call after the socket/session has already stopped — this holds no
   * reference to either.
   */
  getTurns(): TranscriptTurn[] {
    this.flush();
    return this.turns.length > MAX_TURNS ? this.turns.slice(-MAX_TURNS) : this.turns;
  }
}
