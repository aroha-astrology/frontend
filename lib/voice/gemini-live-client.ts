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

const WS_BASE =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";

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

export interface VoiceGrantLike {
  voiceSessionId: string;
  token: string;
  model: string;
  expiresAt: number;
  minutesUsed: number;
  minutesRemaining: number;
}

export type VoiceSessionState = "connecting" | "listening" | "speaking" | "closed";

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
  private resumptionHandle: string | undefined;
  private stopped = false;
  /** Set while swapping tokens, so the outgoing socket's close isn't treated as a hangup. */
  private renewing = false;

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
      this.setState("closed");
      this.opts.onError(
        new Error(
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

    ws.onopen = () => {
      // Model only. The system instruction, response modality and resumption
      // config are pinned into the token server-side (liveConnectConstraints),
      // so sending them here would at best duplicate and at worst conflict.
      ws.send(JSON.stringify({ setup: { model: `models/${grant.model}` } }));
    };

    ws.onmessage = (evt) => {
      void this.handleMessage(evt.data);
    };

    ws.onerror = () => {
      if (this.stopped || this.renewing) return;
      this.opts.onError(new Error("Voice connection error"));
    };

    ws.onclose = () => {
      // A close during a token swap is expected — the next socket is already
      // being opened, so it must not tear the session down.
      if (this.stopped || this.renewing) return;
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
      this.stopPlayback();
      this.setState("listening");
      return;
    }

    if (content.inputTranscription?.text) {
      this.opts.onTranscript?.(content.inputTranscription.text, "user");
    }
    if (content.outputTranscription?.text) {
      this.opts.onTranscript?.(content.outputTranscription.text, "model");
    }

    for (const part of content.modelTurn?.parts ?? []) {
      if (part.text) this.opts.onTranscript?.(part.text, "model");
      if (part.inlineData?.data && part.inlineData.mimeType?.startsWith("audio/")) {
        this.enqueueAudio(part.inlineData.data);
        this.setState("speaking");
      }
    }

    if (content.turnComplete) this.setState("listening");
  }

  private sendAudio(buf: ArrayBuffer): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(
      JSON.stringify({
        realtimeInput: {
          mediaChunks: [
            { mimeType: `audio/pcm;rate=${MIC_SAMPLE_RATE}`, data: base64FromBuffer(buf) },
          ],
        },
      }),
    );
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

    // Swap sockets without disturbing the mic or the playback queue.
    this.renewing = true;
    try {
      if (this.ws && this.ws.readyState < WebSocket.CLOSING) {
        this.ws.close(1000, "minute boundary");
      }
      this.ws = null;
      this.connect(next);
    } finally {
      this.renewing = false;
    }
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
