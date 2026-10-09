import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GeminiLiveSession, type VoiceGrantLike, type VoiceSessionState } from "./gemini-live-client";

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
  currentTime = 0;
  destination = {};
  audioWorklet = { addModule: async () => {} };
  createMediaStreamSource() {
    return { connect() {}, disconnect() {} };
  }
  async close() {}
}

class FakeAudioWorkletNode {
  port: { onmessage: unknown } = { onmessage: null };
  disconnect() {}
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
    await vi.advanceTimersByTimeAsync(55_000);
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
    await vi.advanceTimersByTimeAsync(55_000);

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
