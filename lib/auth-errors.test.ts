import { describe, it, expect, vi, beforeEach } from "vitest";

const reportAuthError = vi.fn();
vi.mock("@/lib/auth-error-report", () => ({ reportAuthError: (...a: unknown[]) => reportAuthError(...a) }));
vi.mock("posthog-js", () => ({ default: { __loaded: false, capture: vi.fn() } }));

import { authErrorKey } from "./auth-errors";

// What @capacitor-firebase/authentication 6.x rejects with on Android when
// Google's ApiException fails: no code, the status leading the message.
const native = (message: string) => Object.assign(new Error(message), { name: "Error" });

describe("authErrorKey on native Google sign-in", () => {
  beforeEach(() => reportAuthError.mockClear());

  it("status 8 gets its own message and is still reported", () => {
    expect(authErrorKey(native("8: "), "google")).toBe("auth.googlePhoneError");
    expect(reportAuthError).toHaveBeenCalledTimes(1);
  });

  it("a closed account chooser (12501) reads as cancelled and is not reported", () => {
    expect(authErrorKey(native("12501: "), "google")).toBe("auth.googleCancelled");
    expect(reportAuthError).not.toHaveBeenCalled();
  });

  it("no network (7) gets the network message", () => {
    expect(authErrorKey(native("7: "), "google")).toBe("auth.googleNetwork");
  });

  it("reads the status from the code when the plugin sets one", () => {
    expect(authErrorKey({ code: "8", message: "8: " }, "google")).toBe("auth.googlePhoneError");
  });

  it("our own setup errors (10) stay generic and reach the ops chat", () => {
    expect(authErrorKey(native("10: "), "google")).toBe("auth.genericError");
    expect(reportAuthError).toHaveBeenCalledTimes(1);
  });

  it("leaves other steps alone", () => {
    expect(authErrorKey(native("8: "), "otp-send")).toBe("auth.genericError");
  });
});
