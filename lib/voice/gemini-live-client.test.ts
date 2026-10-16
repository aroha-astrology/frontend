import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GeminiLiveSession, VoiceCallError, type VoiceGrantLike, type VoiceSessionState } from "./gemini-live-client";

/**
 * A socket that closes the way a real one does: `close()` only starts the
 * closing handshake, and the `close` event arrives later, whenever the test
 * says so. That delay is the whole point — the minute-boundary bug only shows
 * up when the old socket's close event lands after the new socket exists.
 */
class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: FakeWebSocket[] = [];

  readyState = FakeWebSocket.CONNECTING;
  binaryType = "blob";
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((evt: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: ((evt: { code: number; reason: string }) => void) | null = null;

  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.readyState = FakeWebSocket.CLOSING;
  }

  open() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }

  receive(msg: unknown) {
    this.onmessage?.({ data: JSON.stringify(msg) });
  }

  fireClose(code: number, reason = "") {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.({ code, reason });
  }
}

class FakeAudioContext {
  // Follows the faked clock, so audio "queued" by a test plays out as time passes.
  get currentTime() {
    return Date.now() / 1000;
  }
  destination = {};
  audioWorklet = { addModule: async () => {} };
  createMediaStreamSource() {
    return { connect() {}, disconnect() {} };
  }
  createBuffer(_channels: number, length: number, rate: number) {
    return { duration: length / rate, copyToChannel() {} };
  }
  createBufferSource() {
    return { buffer: null, connect() {}, start() {}, stop() {}, onended: null };
  }
  async close() {}
}

class FakeAudioWorkletNode {
  static last: FakeAudioWorkletNode | null = null;
  port: { onmessage: ((e: { data: ArrayBuffer }) => void) | null } = { onmessage: null };
  constructor() {
    FakeAudioWorkletNode.last = this;
  }
  disconnect() {}
  /** One 64ms microphone frame, as the capture worklet posts it. */
  frame(level: number) {
    const samples = new Int16Array(1024).fill(level);
    this.port.onmessage?.({ data: samples.buffer });
  }
}

/** Base64 of `seconds` of 24kHz 16-bit audio, the model's reply format. */
function audioChunk(seconds: number): string {
  const bytes = new Uint8Array(24_000 * seconds * 2);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/**
 * Lets `seconds` of a call go by with the caller talking, so the silence hang-up
 * (tested separately below) has nothing to say. Speech goes to whichever socket
 * is current, because a renewal swaps it part-way through.
 */
async function talkFor(seconds: number) {
  for (let i = 0; i < seconds; i += 5) {
    FakeWebSocket.instances.at(-1)!.receive({ serverContent: { inputTranscription: { text: "and another thing" } } });
    await vi.advanceTimersByTimeAsync(Math.min(5, seconds - i) * 1000);
  }
}

const grant = (minutesUsed: number, msFromNow: number): VoiceGrantLike => ({
  voiceSessionId: "vs_1",
  token: `token-${minutesUsed}`,
  model: "gemini-live",
  expiresAt: Date.now() + msFromNow,
  minutesUsed,
  minutesRemaining: 3 - minutesUsed,
});

describe("GeminiLiveSession minute renewal", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeWebSocket.instances = [];
    vi.stubGlobal("WebSocket", FakeWebSocket);
    vi.stubGlobal("AudioContext", FakeAudioContext);
    vi.stubGlobal("AudioWorkletNode", FakeAudioWorkletNode);
    vi.stubGlobal("navigator", {
      mediaDevices: { getUserMedia: async () => ({ getTracks: () => [] }) },
    });
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:capture");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function startCall() {
    const errors: Error[] = [];
    const states: VoiceSessionState[] = [];
    const onNeedNextMinute = vi.fn(async () => grant(2, 60_000));
    const session = new GeminiLiveSession({
      onNeedNextMinute,
      onError: (err) => errors.push(err),
      onStateChange: (s) => states.push(s),
    });

    await session.start(grant(1, 60_000));
    const first = FakeWebSocket.instances[0]!;
    first.open();
    first.receive({ setupComplete: {} });
    await vi.advanceTimersByTimeAsync(0);

    return { session, errors, states, onNeedNextMinute, first };
  }

  it("keeps the call alive when the old socket's close arrives after the swap", async () => {
    const { errors, states, onNeedNextMinute, first } = await startCall();
    expect(states.at(-1)).toBe("listening");

    // 5 seconds before the minute ends the client buys the next one and swaps sockets.
    await talkFor(55);
    expect(onNeedNextMinute).toHaveBeenCalledTimes(1);
    expect(FakeWebSocket.instances).toHaveLength(2);
    expect(first.readyState).toBe(FakeWebSocket.CLOSING);

    // The browser reports the old socket closed only now, with the new one already in place.
    first.fireClose(1000);
    await vi.advanceTimersByTimeAsync(0);

    expect(errors).toEqual([]);
    expect(states.at(-1)).not.toBe("closed");

    const second = FakeWebSocket.instances[1]!;
    second.open();
    second.receive({ setupComplete: {} });
    await vi.advanceTimersByTimeAsync(0);

    expect(errors).toEqual([]);
    expect(states.at(-1)).toBe("listening");
    // The greeting belongs to the start of the call, not to every minute.
    expect(second.sent.some((frame) => frame.includes("CALL_CONNECTED"))).toBe(false);
  });

  it("ignores a late error event from the socket it already replaced", async () => {
    const { errors, first } = await startCall();
    await talkFor(55);

    first.onerror?.();
    first.fireClose(1006);
    await vi.advanceTimersByTimeAsync(0);

    expect(errors).toEqual([]);
  });

  it("still reports the current socket closing on its own", async () => {
    const { errors, states, first } = await startCall();

    first.fireClose(1011, "internal error");
    await vi.advanceTimersByTimeAsync(0);

    expect(errors).toHaveLength(1);
    expect(errors[0]!.message).toContain("1011");
    expect(states.at(-1)).toBe("closed");
  });
});

describe("GeminiLiveSession hangs up when nobody speaks", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeWebSocket.instances = [];
    FakeAudioWorkletNode.last = null;
    vi.stubGlobal("WebSocket", FakeWebSocket);
    vi.stubGlobal("AudioContext", FakeAudioContext);
    vi.stubGlobal("AudioWorkletNode", FakeAudioWorkletNode);
    vi.stubGlobal("navigator", {
      mediaDevices: { getUserMedia: async () => ({ getTracks: () => [] }) },
    });
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:capture");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function startCall() {
    const errors: VoiceCallError[] = [];
    const states: VoiceSessionState[] = [];
    const session = new GeminiLiveSession({
      // A long grant, so the minute renewal never interferes with these timings.
      onNeedNextMinute: async () => grant(2, 600_000),
      onError: (err) => errors.push(err as VoiceCallError),
      onStateChange: (s) => states.push(s),
    });
    await session.start(grant(1, 600_000));
    const ws = FakeWebSocket.instances[0]!;
    ws.open();
    ws.receive({ setupComplete: {} });
    await vi.advanceTimersByTimeAsync(0);
    return { session, errors, states, ws, mic: FakeAudioWorkletNode.last! };
  }

  /** Ticks `seconds` of silence: a quiet microphone frame every second, as a real call has. */
  async function silence(mic: FakeAudioWorkletNode, seconds: number) {
    for (let i = 0; i < seconds; i++) {
      mic.frame(0);
      await vi.advanceTimersByTimeAsync(1000);
    }
  }

  it("ends the call after 10 seconds with no user input", async () => {
    const { errors, states, mic } = await startCall();

    await silence(mic, 9);
    expect(errors).toEqual([]);

    await silence(mic, 2);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.kind).toBe("idle");
    expect(states.at(-1)).toBe("closed");
  });

  it("the user speaking (as the server transcribes it) restarts the 10 seconds", async () => {
    const { errors, ws, mic } = await startCall();

    await silence(mic, 8);
    ws.receive({ serverContent: { inputTranscription: { text: "tell me about my career" } } });
    await silence(mic, 8);
    expect(errors).toEqual([]);

    await silence(mic, 4);
    expect(errors).toHaveLength(1);
  });

  it("talking over the Baba counts as input", async () => {
    const { errors, ws, mic } = await startCall();

    await silence(mic, 8);
    ws.receive({ serverContent: { interrupted: true } });
    await silence(mic, 8);

    expect(errors).toEqual([]);
  });

  it("a loud microphone counts as input even if no words come back", async () => {
    const { errors, mic } = await startCall();

    await silence(mic, 8);
    mic.frame(6000);
    await silence(mic, 8);
    expect(errors).toEqual([]);

    await silence(mic, 4);
    expect(errors).toHaveLength(1);
  });

  it("room noise below speech level does not keep the call open", async () => {
    const { errors, mic } = await startCall();

    for (let i = 0; i < 12; i++) {
      mic.frame(150); // about 0.5% of full scale: a quiet room
      await vi.advanceTimersByTimeAsync(1000);
    }

    expect(errors).toHaveLength(1);
  });

  it("never hangs up while the Baba is still speaking, however long the answer", async () => {
    const { errors, ws, mic } = await startCall();

    await silence(mic, 1);
    // A 15 second answer, queued for playback all at once.
    ws.receive({ serverContent: { modelTurn: { parts: [{ inlineData: { mimeType: "audio/pcm", data: audioChunk(15) } }] } } });
    await silence(mic, 14);
    expect(errors).toEqual([]);

    // The answer finishes at about 16s; ten silent seconds after that the call ends.
    await silence(mic, 8);
    expect(errors).toEqual([]);
    await silence(mic, 4);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.kind).toBe("idle");
  });

  it("does not start the clock before the call is set up", async () => {
    const errors: VoiceCallError[] = [];
    const session = new GeminiLiveSession({
      onNeedNextMinute: async () => grant(2, 600_000),
      onError: (err) => errors.push(err as VoiceCallError),
    });
    await session.start(grant(1, 600_000));
    // The socket never answers: a slow connection is not a silent caller.
    await vi.advanceTimersByTimeAsync(30_000);

    expect(errors).toEqual([]);
    await session.stop();
  });

  it("stops watching once the call is ended", async () => {
    const { session, errors } = await startCall();

    await session.stop();
    await vi.advanceTimersByTimeAsync(60_000);

    expect(errors).toEqual([]);
  });
});
