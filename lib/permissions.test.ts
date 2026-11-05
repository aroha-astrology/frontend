import { describe, it, expect } from "vitest";
import { checkPermission, requestPermission, type PermissionEnv } from "./permissions";

const q = (state: string): NonNullable<PermissionEnv["permissions"]> => ({ query: async () => ({ state }) });
const domErr = (name: string) => Object.assign(new Error(name), { name });

/** A getUserMedia that records its constraints and how many tracks were stopped. */
function media(result: "ok" | Error) {
  const seen = { constraints: undefined as MediaStreamConstraints | undefined, stopped: 0 };
  const mediaDevices: NonNullable<PermissionEnv["mediaDevices"]> = {
    getUserMedia: async (c) => {
      seen.constraints = c;
      if (result !== "ok") throw result;
      return { getTracks: () => [{ stop: () => void seen.stopped++ }] };
    },
  };
  return { seen, mediaDevices };
}

function notification(permission: string, asked: string) {
  const seen = { asked: 0 };
  const Notification = {
    permission,
    requestPermission: async () => {
      seen.asked++;
      return asked;
    },
  };
  return { seen, Notification };
}

describe("checkPermission", () => {
  it.each(["granted", "prompt", "denied"])("microphone %s is passed through", async (state) => {
    expect(await checkPermission("microphone", { permissions: q(state) })).toBe(state);
  });

  it("asks the browser about geolocation for the location kind", async () => {
    const names: string[] = [];
    const permissions = { query: async (d: { name: string }) => (names.push(d.name), { state: "granted" }) };
    expect(await checkPermission("location", { permissions })).toBe("granted");
    expect(names).toEqual(["geolocation"]);
  });

  it("a browser without the permissions API, or one that throws, is 'prompt' when the device can be asked", async () => {
    const { mediaDevices } = media("ok");
    expect(await checkPermission("microphone", { mediaDevices })).toBe("prompt");
    const throwing = { query: async () => { throw new Error("bad name"); } };
    expect(await checkPermission("camera", { permissions: throwing, mediaDevices })).toBe("prompt");
  });

  it("nothing to ask with is 'unsupported'", async () => {
    expect(await checkPermission("microphone", {})).toBe("unsupported");
    expect(await checkPermission("location", {})).toBe("unsupported");
    expect(await checkPermission("notifications", {})).toBe("unsupported");
  });

  it("notifications read Notification.permission, 'default' meaning prompt", async () => {
    expect(await checkPermission("notifications", { Notification: notification("default", "").Notification })).toBe("prompt");
    expect(await checkPermission("notifications", { Notification: notification("granted", "").Notification })).toBe("granted");
    expect(await checkPermission("notifications", { Notification: notification("denied", "").Notification })).toBe("denied");
  });
});

describe("requestPermission: microphone and camera", () => {
  it("microphone granted: asks for audio and lets the device go again", async () => {
    const m = media("ok");
    expect(await requestPermission("microphone", { mediaDevices: m.mediaDevices })).toBe("granted");
    expect(m.seen.constraints).toEqual({ audio: true });
    expect(m.seen.stopped).toBe(1);
  });

  it("camera granted: asks for video", async () => {
    const m = media("ok");
    expect(await requestPermission("camera", { mediaDevices: m.mediaDevices })).toBe("granted");
    expect(m.seen.constraints).toEqual({ video: true });
  });

  it("refused while the browser still says 'prompt' = denied (can ask again)", async () => {
    const m = media(domErr("NotAllowedError"));
    expect(await requestPermission("microphone", { mediaDevices: m.mediaDevices, permissions: q("prompt") })).toBe("denied");
  });

  it("refused and the browser now says 'denied' = blocked for good", async () => {
    const m = media(domErr("NotAllowedError"));
    expect(await requestPermission("microphone", { mediaDevices: m.mediaDevices, permissions: q("denied") })).toBe("blocked");
  });

  it("refused with no permissions API = denied", async () => {
    const m = media(domErr("NotAllowedError"));
    expect(await requestPermission("microphone", { mediaDevices: m.mediaDevices })).toBe("denied");
  });

  it("no microphone or camera on the device = no-device, whatever the permission says", async () => {
    const m = media(domErr("NotFoundError"));
    expect(await requestPermission("microphone", { mediaDevices: m.mediaDevices, permissions: q("granted") })).toBe("no-device");
    expect(await requestPermission("camera", { mediaDevices: m.mediaDevices, permissions: q("granted") })).toBe("no-device");
  });

  it("no mediaDevices at all = unsupported", async () => {
    expect(await requestPermission("microphone", {})).toBe("unsupported");
  });
});

describe("requestPermission: location", () => {
  const geo = (fail: number | null): NonNullable<PermissionEnv["geolocation"]> => ({
    getCurrentPosition: (ok, bad) => (fail === null ? ok() : bad({ code: fail })),
  });

  it("a fix = granted", async () => {
    expect(await requestPermission("location", { geolocation: geo(null) })).toBe("granted");
  });

  it("refused (code 1): blocked when the browser says denied, denied when it still says prompt", async () => {
    expect(await requestPermission("location", { geolocation: geo(1), permissions: q("denied") })).toBe("blocked");
    expect(await requestPermission("location", { geolocation: geo(1), permissions: q("prompt") })).toBe("denied");
  });

  it("no fix or timeout (codes 2, 3) is not a permission problem", async () => {
    expect(await requestPermission("location", { geolocation: geo(2) })).toBe("granted");
    expect(await requestPermission("location", { geolocation: geo(3) })).toBe("granted");
  });

  it("no geolocation = unsupported", async () => {
    expect(await requestPermission("location", {})).toBe("unsupported");
  });
});

describe("requestPermission: notifications", () => {
  it("grant", async () => {
    const n = notification("default", "granted");
    expect(await requestPermission("notifications", { Notification: n.Notification })).toBe("granted");
    expect(n.seen.asked).toBe(1);
  });

  it("a 'no' on the dialog = blocked (the browser will not ask again)", async () => {
    expect(await requestPermission("notifications", { Notification: notification("default", "denied").Notification })).toBe("blocked");
  });

  it("already denied = blocked, and the dialog is not tried", async () => {
    const n = notification("denied", "granted");
    expect(await requestPermission("notifications", { Notification: n.Notification })).toBe("blocked");
    expect(n.seen.asked).toBe(0);
  });

  it("no Notification = unsupported", async () => {
    expect(await requestPermission("notifications", {})).toBe("unsupported");
  });
});
