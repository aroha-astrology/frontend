/**
 * Gemini Live WebSocket client for realtime voice chat.
 *
 * Shape of the thing, because it is unusual:
 *
 *   - Audio never touches our backend. This client streams PCM straight to
 *     Google over a WebSocket. Our server's only involvement is minting the
 *     short-lived token that authorises it.
 *   - A token buys exactly ONE MINUTE. Google stops accepting audio at the
 *     token's expiry, so continuing means asking our backend to charge another
 *     minute and issue a fresh token. That is what `onNeedNextMinute` is for.
 *   - The microphone, the audio graph and the playback queue all survive that
 *     swap — only the socket is replaced — so a minute boundary is inaudible.
 *   - The persona, the chart grounding and the content policy are baked into
 *     the token server-side. This client deliberately does NOT send a system
 *     instruction: anything it could send, a tampered client could change.
 *
 * Wire format: 16kHz 16-bit PCM little-endian up, 24kHz 16-bit PCM down, both
 * base64 in JSON frames.
 */

import { TranscriptBuffer, type TranscriptTurn } from "./transcript";
export type { TranscriptTurn };

/**
 * `BidiGenerateContentConstrained`, NOT `BidiGenerateContent`.
 *
 * They are two different endpoints with two different auth models. The plain
 * one authenticates a caller holding a real API key — server to server. It
 * rejects an ephemeral token outright, closing with 1008 "Method doesn't allow
 * unregistered callers (callers without established identity)", which looks
 * exactly like the call screen opening and shutting again.
 *
 * The Constrained endpoint is the browser-facing half of the ephemeral-token
 * design: it accepts the minted token and enforces whatever was pinned into it
 * at mint time (see the backend's gemini-live-token.ts). Verified against the
 * live endpoint — the same token that gets 1008 here answers `setupComplete`
 * there.
 */
const WS_BASE =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained";

const MIC_SAMPLE_RATE = 16_000;
const PLAYBACK_SAMPLE_RATE = 24_000;

/** Samples per outbound frame — 1024 @16kHz is 64ms, small enough for snappy barge-in. */
const FRAME_SAMPLES = 1024;

/**
 * How long before a token expires to buy the next minute. Needs to cover a
 * round trip to our backend plus a fresh WebSocket handshake; 5s is generous
 * without meaningfully overcharging anyone who hangs up right at the boundary.
 */
const RENEW_LEAD_MS = 5_000;

/** Scheduling cushion for playback, absorbing jitter without audible lag. */
const PLAYBACK_LEAD_S = 0.08;

/**
 * How long a call may go with nobody speaking before it is hung up (owner's
 * rule, 2026-10-10: "if no user input in last 10 sec then disconnect call").
 *
 * What counts as the user speaking, any one of:
 *   - Google transcribed some of their speech back to us (`inputTranscription`);
 *   - they talked over the Baba (`interrupted`);
 *   - the microphone is loud enough to be a voice (see SPEECH_RMS).
 * The first is the reliable one, because it is Google's own voice detection;
 * the last is the backstop for a transcription that never comes.
 *
 * And the clock does not run while the Baba is speaking. Counting from the
 * user's last word would hang up in the middle of any answer longer than ten
 * seconds, on someone who is simply listening, after they have paid for it.
 * So the ten seconds start when the Baba finishes, and each thing the user says
 * starts them again.
 */
const IDLE_TIMEOUT_MS = 10_000;
/** How often the idle clock is read. Browsers run a hidden page's timers about once a second anyway. */
const IDLE_CHECK_MS = 1_000;
/**
 * Loudness of one microphone frame (RMS, 0 to 1 of full scale) that counts as a
 * voice. Speech through the phone's echo canceller sits around 0.05 to 0.2 and a
 * quiet room well under 0.01; automatic gain control can lift the room toward
 * 0.02, so this sits above that. Raise it if hang-ups never happen in a noisy
 * room; lower it if a quiet speaker is being hung up on.
 */
const SPEECH_RMS = 0.03;

/**
 * Synthetic first turn sent right after `setupComplete`, so the model speaks
 * a greeting instead of sitting in silence waiting for the user's mic. Not a
 * real user utterance — the backend's voice system instruction (see
 * scholar.ts's buildVoiceSystemInstruction) is told to treat this exact text
 * as a call-connected signal, not a question, and reply with only an opening
 * greeting. Must match that prompt's sentinel exactly.
 */
const GREETING_TRIGGER = "[[CALL_CONNECTED]]";

export interface VoiceGrantLike {
  voiceSessionId: string;
  token: string;
  model: string;
  expiresAt: number;
  minutesUsed: number;
  minutesRemaining: number;
}

export type VoiceSessionState = "connecting" | "listening" | "speaking" | "closed";

/**
 * Why a call ended badly, so the UI can pick a translated sentence instead of
 * showing `message` — which is written for the console and carries the raw
 * close code.
 *
 *   - "microphone": the mic could not be opened.
 *   - "refused": the server closed the socket before the call was set up.
 *   - "dropped": a call that was running was closed from the other end.
 *   - "idle": nobody spoke for IDLE_TIMEOUT_MS, so we hung up.
 */
export type VoiceCallErrorKind = "microphone" | "refused" | "dropped" | "idle";

export class VoiceCallError extends Error {
  readonly kind: VoiceCallErrorKind;
  constructor(kind: VoiceCallErrorKind, message: string) {
    super(message);
    this.name = "VoiceCallError";
    this.kind = kind;
  }
}

export interface GeminiLiveSessionOptions {
  /**
   * Buys the next minute. Return the new grant to continue, or null to stop
   * (out of credits, ceiling reached, or the user declined). Throwing is
   * treated as null plus an error callback.
   */
  onNeedNextMinute: () => Promise<VoiceGrantLike | null>;
  onStateChange?: (state: VoiceSessionState) => void;
  /** Fired whenever a minute is granted, so the UI can show elapsed time/spend. */
  onMinuteGranted?: (grant: VoiceGrantLike) => void;
  /** Terminal — the session is dead once this fires. */
  onError: (err: Error) => void;
  onClosed?: () => void;
  /** Optional live captions. */
  onTranscript?: (text: string, role: "user" | "model") => void;
}

/**
 * Downsamples whatever rate the device gives us to the 16kHz the Live API
 * requires. Done here rather than by asking `getUserMedia` for 16kHz because
 * that constraint is a hint browsers are free to ignore, and Safari in
 * particular ignores it — leaving audio that sounds fine locally but arrives
 * at Google pitch-shifted and unintelligible.
 */
const CAPTURE_WORKLET = `
class PcmCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this._acc = [];
    this._ratio = sampleRate / ${MIC_SAMPLE_RATE};
    this._pos = 0;
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    // Linear interpolation onto the 16kHz grid.
    while (this._pos < ch.length) {
      const i = Math.floor(this._pos);
      const frac = this._pos - i;
      const a = ch[i];
      const b = i + 1 < ch.length ? ch[i + 1] : ch[i];
      const s = Math.max(-1, Math.min(1, a + (b - a) * frac));
      this._acc.push(s < 0 ? s * 0x8000 : s * 0x7fff);
      this._pos += this._ratio;
      if (this._acc.length >= ${FRAME_SAMPLES}) {
        const frame = new Int16Array(this._acc.splice(0, ${FRAME_SAMPLES}));
        this.port.postMessage(frame.buffer, [frame.buffer]);
      }
    }
    this._pos -= ch.length;
    return true;
  }
}
registerProcessor('pcm-capture', PcmCapture);
`;

interface ServerMessage {
  setupComplete?: Record<string, unknown>;
  sessionResumptionUpdate?: { newHandle?: string; resumable?: boolean };
  goAway?: { timeLeft?: string };
  serverContent?: {
    interrupted?: boolean;
    turnComplete?: boolean;
    inputTranscription?: { text?: string };
    outputTranscription?: { text?: string };
    modelTurn?: {
      parts?: Array<{ text?: string; inlineData?: { mimeType?: string; data?: string } }>;
    };
  };
}

export class GeminiLiveSession {
  private opts: GeminiLiveSessionOptions;
  private grant: VoiceGrantLike | null = null;

  private ws: WebSocket | null = null;
  private micStream: MediaStream | null = null;
  private captureCtx: AudioContext | null = null;
  private captureNode: AudioWorkletNode | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;

  private playbackCtx: AudioContext | null = null;
  private scheduled: AudioBufferSourceNode[] = [];
  private nextPlayAt = 0;

  private renewTimer: ReturnType<typeof setTimeout> | null = null;
  /** Reads the idle clock; runs only between `setupComplete` and the end of the call. */
  private idleTimer: ReturnType<typeof setInterval> | null = null;
  /** When someone last spoke (or the Baba last did), epoch ms. */
  private lastActivityAt = 0;
  private resumptionHandle: string | undefined;
  private stopped = false;
  /**
   * Whether Google has acknowledged the setup frame on the CURRENT socket.
   * Distinguishes a call that ran and ended from one the server refused before
   * it ever started — see `ws.onclose`.
   */
  private setupCompleted = false;
  /**
   * Guards the greeting trigger to fire exactly once per call. `connect()`
   * also runs on every per-minute renewal (`renew()`), and re-sending it
   * there would make the model re-greet the user every minute.
   */
  private greetingSent = false;
  /** Assembles inputTranscription/outputTranscription fragments into whole turns. */
  private transcript = new TranscriptBuffer();

  constructor(opts: GeminiLiveSessionOptions) {
    this.opts = opts;
  }

  /** Opens the mic and connects using an already-purchased first minute. */
  async start(grant: VoiceGrantLike): Promise<void> {
    if (this.micStream) return;
    this.grant = grant;
    this.stopped = false;

    this.setState("connecting");

    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (err) {
      // `err.name` is the actionable part: NotAllowedError means the user (or
      // the OS/app shell) denied the mic — on Android this is the symptom of a
      // missing native permission declaration, not the user tapping "deny" —
      // while NotFoundError means the device has no microphone at all. Logged
      // separately from the message shown in the UI so it survives even if a
      // future translation of the message drops the detail.
      console.warn("voice: getUserMedia failed", err instanceof Error ? err.name : err, err);
      this.setState("closed");
      this.opts.onError(
        new VoiceCallError(
          "microphone",
          `Microphone unavailable: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
      return;
    }

    // Capture runs at the device's native rate; the worklet resamples. Playback
    // gets its own context pinned to 24kHz — one context reused for the whole
    // call, because creating one per audio chunk exhausts the browser's limit
    // (~6 in Chrome) within seconds and chops the reply into fragments.
    this.captureCtx = new AudioContext();
    this.playbackCtx = new AudioContext({ sampleRate: PLAYBACK_SAMPLE_RATE });

    const blobUrl = URL.createObjectURL(
      new Blob([CAPTURE_WORKLET], { type: "application/javascript" }),
    );
    try {
      await this.captureCtx.audioWorklet.addModule(blobUrl);
    } finally {
      URL.revokeObjectURL(blobUrl);
    }

    this.micSource = this.captureCtx.createMediaStreamSource(this.micStream);
    this.captureNode = new AudioWorkletNode(this.captureCtx, "pcm-capture");
    this.captureNode.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
      this.sendAudio(e.data);
    };
    this.micSource.connect(this.captureNode);

    this.connect(grant);
  }

  /** Closes everything. Safe to call repeatedly and from an unload handler. */
  async stop(): Promise<void> {
    this.stopped = true;
    this.clearRenewTimer();
    this.stopIdleWatch();
    this.stopPlayback();

    if (this.ws && this.ws.readyState < WebSocket.CLOSING) {
      this.ws.close(1000, "client stopped");
    }
    this.ws = null;

    this.captureNode?.disconnect();
    this.micSource?.disconnect();
    this.captureNode = null;
    this.micSource = null;

    this.micStream?.getTracks().forEach((t) => t.stop());
    this.micStream = null;

    await this.captureCtx?.close().catch(() => {});
    await this.playbackCtx?.close().catch(() => {});
    this.captureCtx = null;
    this.playbackCtx = null;

    this.setState("closed");
    this.opts.onClosed?.();
  }

  // ── Connection ────────────────────────────────────────────────────────────

  private connect(grant: VoiceGrantLike): void {
    // Ephemeral tokens go in `access_token`, not the `key` parameter used for
    // real API keys — `key` rejects them.
    const ws = new WebSocket(`${WS_BASE}?access_token=${encodeURIComponent(grant.token)}`);
    ws.binaryType = "arraybuffer";
    this.ws = ws;
    this.setupCompleted = false;

    ws.onopen = () => {
      // Model only. The system instruction, response modality and resumption
      // config are pinned into the token server-side (liveConnectConstraints),
      // so sending them here would at best duplicate and at worst conflict.
      ws.send(JSON.stringify({ setup: { model: `models/${grant.model}` } }));
    };

    // Every handler below first checks that `ws` is still the session's
    // socket. A minute renewal replaces the socket, and the replaced one keeps
    // reporting for a moment afterwards: `close()` only starts the closing
    // handshake, so its close event arrives after the new socket is in place.
    // A flag set around the swap cannot cover that, because the event fires
    // long after the swap has returned — which is how every call used to end
    // itself with "connection refused (code 1000)" at its first renewal.
    ws.onmessage = (evt) => {
      if (this.ws !== ws) return;
      void this.handleMessage(evt.data);
    };

    ws.onerror = () => {
      // The WebSocket error event carries no useful detail (by spec), and a
      // close event always follows it with the code and reason that actually
      // explain anything. So this only logs; onclose does the reporting.
      console.warn("voice: socket error (see the close event that follows for detail)");
    };

    ws.onclose = (evt) => {
      // Logged unconditionally, before any early return below — diagnosis must
      // not depend on which branch the rest of this handler takes. This is the
      // one place that tells us whether a session that looked fine actually
      // reached Google at all.
      console.warn("voice: socket closed", {
        code: evt.code,
        reason: evt.reason || "(none)",
        setupCompleted: this.setupCompleted,
        stopped: this.stopped,
        replaced: this.ws !== ws,
      });

      // A socket that a renewal already replaced is expected to close — the
      // next one is in place, so this must not tear the session down.
      if (this.stopped || this.ws !== ws) return;

      // Closing BEFORE `setupComplete` means the server refused the connection
      // rather than the call having ended. Report the code and reason: this
      // used to tear down silently, so a rejection (e.g. 1008 "Method doesn't
      // allow unregistered callers", which is what an ephemeral token gets on
      // the wrong endpoint) showed the user a call screen that simply
      // disappeared, and left nothing in the console to explain it.
      //
      // A close AFTER setupComplete that isn't a hangup or a renewal (both
      // already excluded above) is Google ending the call unilaterally — a
      // quota cutoff, a goAway, a server-side error. That used to look
      // identical to the user hanging up on themselves; it now surfaces too,
      // for the same reason: silence here is indistinguishable from success.
      this.opts.onError(
        new VoiceCallError(
          this.setupCompleted ? "dropped" : "refused",
          `Voice ${this.setupCompleted ? "call ended unexpectedly" : "connection refused"} (code ${evt.code}${evt.reason ? `: ${evt.reason}` : ""})`,
        ),
      );
      void this.stop();
    };

    this.scheduleRenew(grant);
  }

  private async handleMessage(raw: unknown): Promise<void> {
    let msg: ServerMessage;
    try {
      const text =
        typeof raw === "string"
          ? raw
          : raw instanceof ArrayBuffer
            ? new TextDecoder().decode(raw)
            : await (raw as Blob).text();
      msg = JSON.parse(text) as ServerMessage;
    } catch {
      return;
    }

    if (msg.setupComplete) {
      this.setupCompleted = true;
      if (!this.greetingSent) {
        this.greetingSent = true;
        this.sendGreetingTrigger();
        // The call starts here, not at the first minute's mint: the ten seconds
        // are for someone to answer the greeting, and a slow connection must not
        // eat them.
        this.startIdleWatch();
      }
      this.setState("listening");
      return;
    }

    // Google hands out a fresh resumption handle periodically; the most recent
    // one is what lets the next minute continue this conversation.
    if (msg.sessionResumptionUpdate?.newHandle) {
      this.resumptionHandle = msg.sessionResumptionUpdate.newHandle;
      return;
    }

    const content = msg.serverContent;
    if (!content) return;

    // Barge-in: the user started talking over the model. Everything already
    // queued is now stale and must be dropped, or they'll hear the tail of an
    // answer they interrupted seconds ago.
    if (content.interrupted) {
      this.markActivity();
      this.stopPlayback();
      this.setState("listening");
      return;
    }

    if (content.inputTranscription?.text) {
      this.markActivity();
      this.transcript.append(content.inputTranscription.text, "user");
      this.opts.onTranscript?.(content.inputTranscription.text, "user");
    }
    if (content.outputTranscription?.text) {
      this.transcript.append(content.outputTranscription.text, "model");
      this.opts.onTranscript?.(content.outputTranscription.text, "model");
    }

    for (const part of content.modelTurn?.parts ?? []) {
      if (part.text) {
        this.transcript.append(part.text, "model");
        this.opts.onTranscript?.(part.text, "model");
      }
      if (part.inlineData?.data && part.inlineData.mimeType?.startsWith("audio/")) {
        this.enqueueAudio(part.inlineData.data);
        this.setState("speaking");
      }
    }

    if (content.turnComplete) this.setState("listening");
  }

  private sendAudio(buf: ArrayBuffer): void {
    // Before the socket check: a frame heard while a minute is being renewed is
    // still someone speaking.
    if (frameRms(buf) >= SPEECH_RMS) this.markActivity();
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    // `realtimeInput.audio`, a single Blob — NOT the `mediaChunks` array this
    // used to send. Google now answers that shape with close code 1007,
    // "realtime_input.media_chunks is deprecated. Use audio, video, or text
    // instead." Verified against the live socket: a `mediaChunks` frame gets
    // a protocol-error close, the `audio` shape below does not.
    this.ws.send(
      JSON.stringify({
        realtimeInput: {
          audio: { mimeType: `audio/pcm;rate=${MIC_SAMPLE_RATE}`, data: base64FromBuffer(buf) },
        },
      }),
    );
  }

  /**
   * Nudges the model to speak first instead of waiting for the user's mic.
   * A `clientContent` turn, not `realtimeInput` — this is a synthetic text
   * turn, not audio. The reply comes back through the normal audio-part path
   * in `handleMessage` below, so it plays exactly like any other AI turn.
   */
  private sendGreetingTrigger(): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(
      JSON.stringify({
        clientContent: {
          turns: [{ role: "user", parts: [{ text: GREETING_TRIGGER }] }],
          turnComplete: true,
        },
      }),
    );
  }

  // ── Silence hang-up ───────────────────────────────────────────────────────

  private markActivity(): void {
    this.lastActivityAt = Date.now();
  }

  /** The Baba is still talking: audio is queued that has not finished playing. */
  private modelIsSpeaking(): boolean {
    return this.playbackCtx !== null && this.nextPlayAt > this.playbackCtx.currentTime;
  }

  private startIdleWatch(): void {
    this.stopIdleWatch();
    this.markActivity();
    this.idleTimer = setInterval(() => {
      if (this.stopped) return;
      if (this.modelIsSpeaking()) {
        this.markActivity();
        return;
      }
      if (Date.now() - this.lastActivityAt < IDLE_TIMEOUT_MS) return;

      // Same shape as every other way a call ends: a terminal error the owner of
      // the session turns into a message, then the teardown.
      this.opts.onError(
        new VoiceCallError("idle", `Voice call hung up: nobody spoke for ${IDLE_TIMEOUT_MS / 1000} seconds`),
      );
      void this.stop();
    }, IDLE_CHECK_MS);
  }

  private stopIdleWatch(): void {
    if (this.idleTimer) {
      clearInterval(this.idleTimer);
      this.idleTimer = null;
    }
  }

  // ── Per-minute token renewal ──────────────────────────────────────────────

  private scheduleRenew(grant: VoiceGrantLike): void {
    this.clearRenewTimer();
    const delay = Math.max(0, grant.expiresAt - Date.now() - RENEW_LEAD_MS);
    this.renewTimer = setTimeout(() => void this.renew(), delay);
  }

  private async renew(): Promise<void> {
    if (this.stopped) return;

    let next: VoiceGrantLike | null = null;
    try {
      next = await this.opts.onNeedNextMinute();
    } catch (err) {
      this.opts.onError(err instanceof Error ? err : new Error(String(err)));
      next = null;
    }

    // No next minute — ceiling reached, out of credits, or the user stopped.
    // Ending here rather than letting the token lapse means the call stops at a
    // moment we chose, instead of the audio simply going dead.
    if (!next || this.stopped) {
      await this.stop();
      return;
    }

    this.grant = next;
    this.opts.onMinuteGranted?.(next);

    // Swap sockets without disturbing the mic or the playback queue. The old
    // socket's close event arrives later and is ignored by its own handler,
    // which sees it is no longer `this.ws` (see `connect`).
    const old = this.ws;
    this.ws = null;
    if (old && old.readyState < WebSocket.CLOSING) {
      old.close(1000, "minute boundary");
    }
    this.connect(next);
  }

  private clearRenewTimer(): void {
    if (this.renewTimer) {
      clearTimeout(this.renewTimer);
      this.renewTimer = null;
    }
  }

  // ── Playback queue ────────────────────────────────────────────────────────

  /**
   * Decodes one 24kHz PCM chunk and schedules it immediately after whatever is
   * already queued, so consecutive chunks play as continuous speech rather than
   * overlapping or gapping.
   */
  private enqueueAudio(b64: string): void {
    const ctx = this.playbackCtx;
    if (!ctx) return;

    const bytes = bufferFromBase64(b64);
    const samples = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
    if (samples.length === 0) return;

    const float = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i]!;
      float[i] = s < 0 ? s / 0x8000 : s / 0x7fff;
    }

    const buffer = ctx.createBuffer(1, float.length, PLAYBACK_SAMPLE_RATE);
    buffer.copyToChannel(float, 0);

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);

    const startAt = Math.max(ctx.currentTime + PLAYBACK_LEAD_S, this.nextPlayAt);
    src.start(startAt);
    this.nextPlayAt = startAt + buffer.duration;

    this.scheduled.push(src);
    src.onended = () => {
      this.scheduled = this.scheduled.filter((s) => s !== src);
    };
  }

  private stopPlayback(): void {
    for (const src of this.scheduled) {
      try {
        src.stop();
      } catch {
        /* already ended */
      }
    }
    this.scheduled = [];
    this.nextPlayAt = 0;
  }

  // ── Misc ──────────────────────────────────────────────────────────────────

  private lastState: VoiceSessionState | null = null;
  private setState(state: VoiceSessionState): void {
    if (this.lastState === state) return;
    this.lastState = state;
    this.opts.onStateChange?.(state);
  }

  /** Most recent resumption handle, for the caller to pass to the extend call. */
  get currentResumptionHandle(): string | undefined {
    return this.resumptionHandle;
  }

  get currentGrant(): VoiceGrantLike | null {
    return this.grant;
  }

  /**
   * The whole call's transcript so far, flushing whatever turn is still in
   * progress. Safe to call after `stop()` — the buffer holds no socket
   * reference, only accumulated text — which is what lets `useVoiceCall`'s
   * teardown read it after `await session.stop()` has already torn the
   * connection down.
   */
  getTranscript(): TranscriptTurn[] {
    return this.transcript.getTurns();
  }
}

/** Loudness of one 16-bit microphone frame: RMS as a fraction of full scale. */
function frameRms(buf: ArrayBuffer): number {
  const samples = new Int16Array(buf);
  if (samples.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i]! * samples[i]!;
  return Math.sqrt(sum / samples.length) / 0x8000;
}

function base64FromBuffer(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  // Chunked to stay well clear of the argument-count limit on large frames.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function bufferFromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
