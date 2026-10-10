// Sends the full error behind a generic "Something went wrong" on sign-in to
// the backend, which forwards it to the ops Telegram chat. These failures
// happen inside Firebase on the phone and never reach our API, so without
// this nothing on the server side knows they happened.

import { request } from "@/lib/api";

export type AuthStep = "otp-send" | "otp-verify" | "google" | "apple";

/** Mirrors the backend's AuthErrorReportSchema, including its length limits. */
export interface AuthErrorReport {
  step: AuthStep;
  code: string;
  message: string;
  details?: string;
  stack?: string;
  platform: "web" | "android" | "ios";
  appVersion?: string;
  page?: string;
}

const clip = (text: string, max: number) => (text.length > max ? text.slice(0, max) : text);

/**
 * The report lands in a group chat. Firebase's own messages carry nothing
 * identifying, but a native plugin's or a server's reply can, so anything
 * shaped like an email, a token or a phone number is blanked first.
 */
function redact(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]")
    .replace(/[\w-]{40,}/g, "[token]")
    .replace(/\+?\d{8,}/g, "[number]");
}

/** Everything the error object says about itself, as the report's text fields. */
export function describeAuthError(
  err: unknown,
): Pick<AuthErrorReport, "code" | "message" | "details" | "stack"> {
  if (typeof err !== "object" || err === null) {
    return { code: "", message: clip(redact(String(err)), 1000) };
  }
  const e = err as Record<string, unknown>;

  // Native plugin errors and ApiError keep their useful detail (status,
  // request id, the plugin's own message) in fields beyond code/message.
  const extra: Record<string, unknown> = {};
  if (typeof e.name === "string") extra.name = e.name;
  for (const [key, value] of Object.entries(e)) {
    if (["code", "message", "stack", "name", "customData"].includes(key)) continue;
    extra[key] = value;
  }
  // customData as a whole is skipped — on some errors it holds the person's
  // tokens. Its raw server reply is the one part worth having: it is where
  // Firebase puts the real reason behind a bare "auth/internal-error".
  const server = (e.customData as { _serverResponse?: unknown } | undefined)?._serverResponse;
  if (typeof server === "string") extra.serverResponse = server;

  let details: string | undefined;
  if (Object.keys(extra).length > 0) {
    try {
      details = clip(redact(JSON.stringify(extra)), 2000);
    } catch {
      details = undefined;
    }
  }

  return {
    code: clip(typeof e.code === "string" ? e.code : "", 120),
    message: clip(redact(typeof e.message === "string" ? e.message : ""), 1000),
    details,
    stack: typeof e.stack === "string" ? clip(redact(e.stack), 2000) : undefined,
  };
}

/** Browser, or the native shell and its version. */
async function shellInfo(): Promise<Pick<AuthErrorReport, "platform" | "appVersion">> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return { platform: "web" };
    const platform = Capacitor.getPlatform() === "ios" ? "ios" : "android";
    try {
      const { App } = await import("@capacitor/app");
      const { version, build } = await App.getInfo();
      return { platform, appVersion: `${version} (${build})` };
    } catch {
      return { platform };
    }
  } catch {
    return { platform: "web" };
  }
}

/**
 * Fire-and-forget: a report that fails to send must never add a second
 * error on top of the sign-in failure the person is already looking at.
 */
export function reportAuthError(err: unknown, step: AuthStep): void {
  void (async () => {
    try {
      const report: AuthErrorReport = {
        step,
        ...describeAuthError(err),
        ...(await shellInfo()),
        page: typeof window !== "undefined" ? clip(window.location.pathname, 200) : undefined,
      };
      await request<void>("/v1/public/auth-error", { method: "POST", body: report });
    } catch {
      // Nothing to do — see above.
    }
  })();
}
