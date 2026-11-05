/**
 * Shared "is this permission usable, and if not, why" logic for the microphone,
 * camera, location and notifications. Screens never call getUserMedia or
 * getCurrentPosition blind any more: they go through ensurePermission()
 * (providers/permission-provider.tsx), which uses this file for the state
 * checks and the OS request, and shows the explanation / settings sheet.
 */

export type PermissionKind = "microphone" | "camera" | "location" | "notifications";

/** What the browser or phone says right now. "unsupported" = no way to know / no such thing here. */
export type PermissionState = "granted" | "prompt" | "denied" | "unsupported";

/**
 * Result of asking.
 * - granted: usable now.
 * - denied: the user said no this time; the system may still ask again.
 * - blocked: the system will not show its dialog again (settings is the only way).
 * - no-device: no microphone / camera on this device (asking is pointless).
 * - unsupported: this browser has no such feature.
 */
export type PermissionOutcome = "granted" | "denied" | "blocked" | "no-device" | "unsupported";

/** The browser pieces the helper touches, injectable so tests need no DOM. */
export interface PermissionEnv {
  permissions?: { query(d: { name: string }): Promise<{ state: string }> };
  mediaDevices?: { getUserMedia(c: MediaStreamConstraints): Promise<{ getTracks(): { stop(): void }[] }> };
  geolocation?: {
    getCurrentPosition(ok: () => void, fail: (e: { code: number }) => void, opts?: object): void;
  };
  Notification?: { permission: string; requestPermission(): Promise<string> };
}

function defaultEnv(): PermissionEnv {
  const nav = typeof navigator === "undefined" ? undefined : navigator;
  const g = globalThis as { Notification?: PermissionEnv["Notification"] };
  return {
    permissions: nav?.permissions as PermissionEnv["permissions"],
    mediaDevices: nav?.mediaDevices as PermissionEnv["mediaDevices"],
    geolocation: nav?.geolocation as PermissionEnv["geolocation"],
    Notification: g.Notification,
  };
}

const QUERY_NAME: Record<PermissionKind, string> = {
  microphone: "microphone",
  camera: "camera",
  location: "geolocation",
  notifications: "notifications",
};

export async function checkPermission(kind: PermissionKind, env: PermissionEnv = defaultEnv()): Promise<PermissionState> {
  if (kind === "notifications") {
    if (!env.Notification) return "unsupported";
    const p = env.Notification.permission;
    return p === "granted" ? "granted" : p === "denied" ? "denied" : "prompt";
  }
  if (env.permissions) {
    try {
      const { state } = await env.permissions.query({ name: QUERY_NAME[kind] });
      if (state === "granted" || state === "denied" || state === "prompt") return state;
    } catch {
      // Some phone browsers reject the permission names; fall through to "just ask".
    }
  }
  const canAsk =
    kind === "location" ? Boolean(env.geolocation) : Boolean(env.permissions || env.mediaDevices?.getUserMedia);
  return canAsk ? "prompt" : "unsupported";
}

/** After a refusal: "blocked" if the browser now says denied for good, else "denied" (can ask again). */
async function refusal(kind: PermissionKind, env: PermissionEnv): Promise<PermissionOutcome> {
  return (await checkPermission(kind, env)) === "denied" ? "blocked" : "denied";
}

export async function requestPermission(kind: PermissionKind, env: PermissionEnv = defaultEnv()): Promise<PermissionOutcome> {
  if (kind === "notifications") {
    if (!env.Notification) return "unsupported";
    if (env.Notification.permission === "denied") return "blocked";
    const result = await env.Notification.requestPermission();
    return result === "granted" ? "granted" : result === "denied" ? "blocked" : "denied";
  }
  if (kind === "location") {
    const geo = env.geolocation;
    if (!geo) return "unsupported";
    const code = await new Promise<number | null>((resolve) =>
      geo.getCurrentPosition(
        () => resolve(null),
        (e) => resolve(e.code),
        { timeout: 10_000, maximumAge: 15 * 60_000 },
      ),
    );
    // Code 1 is the only refusal; 2 and 3 (no fix, timed out) mean the permission itself is fine.
    return code === 1 ? refusal(kind, env) : "granted";
  }
  const md = env.mediaDevices;
  if (!md?.getUserMedia) return "unsupported";
  try {
    const stream = await md.getUserMedia(kind === "microphone" ? { audio: true } : { video: true });
    // Only asking: release the device at once so the caller opens it with its own settings.
    stream.getTracks().forEach((t) => t.stop());
    return "granted";
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "NotFoundError" || name === "OverconstrainedError") return "no-device";
    return refusal(kind, env);
  }
}

export { defaultEnv, QUERY_NAME };
