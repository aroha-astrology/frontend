import { describe, it, expect } from "vitest";
import { describeAuthError } from "./auth-error-report";

describe("describeAuthError", () => {
  it("keeps the code, message, name and stack of a Firebase error", () => {
    const err = Object.assign(new Error("Firebase: Error (auth/invalid-app-credential)."), {
      code: "auth/invalid-app-credential",
      name: "FirebaseError",
    });
    const out = describeAuthError(err);

    expect(out.code).toBe("auth/invalid-app-credential");
    expect(out.message).toBe("Firebase: Error (auth/invalid-app-credential).");
    expect(out.details).toContain('"name":"FirebaseError"');
    expect(out.stack).toContain("auth/invalid-app-credential");
  });

  it("carries a native plugin's extra fields and an API error's status and request id", () => {
    const native = describeAuthError({ code: "10", message: "10: ", errorMessage: "DEVELOPER_ERROR" });
    expect(native.details).toContain('"errorMessage":"DEVELOPER_ERROR"');

    const api = describeAuthError(
      Object.assign(new Error("Unauthorized"), { status: 401, code: "unauthorized", requestId: "req-1" }),
    );
    expect(api.details).toContain('"status":401');
    expect(api.details).toContain('"requestId":"req-1"');
  });

  it("takes the server's reply out of customData and leaves the tokens behind", () => {
    const err = Object.assign(new Error("Firebase: Error (auth/internal-error)."), {
      code: "auth/internal-error",
      customData: {
        _serverResponse: '{"error":{"code":400,"message":"BILLING_NOT_ENABLED"}}',
        _tokenResponse: { idToken: "secret-id-token" },
        phoneNumber: "+919876543210",
      },
    });
    const out = describeAuthError(err);

    expect(out.details).toContain("BILLING_NOT_ENABLED");
    expect(out.details).not.toContain("secret-id-token");
    expect(out.details).not.toContain("9876543210");
  });

  it("blanks emails, phone numbers and tokens wherever they appear", () => {
    const out = describeAuthError({
      code: "auth/whatever",
      message: `no account for someone@example.com on +919876543210`,
      data: { token: "a".repeat(60) },
    });

    expect(out.message).toBe("no account for [email] on [number]");
    expect(out.details).toBe('{"data":{"token":"[token]"}}');
  });

  it("copes with something that is not an error object at all", () => {
    expect(describeAuthError("boom")).toEqual({ code: "", message: "boom" });
    expect(describeAuthError(null)).toEqual({ code: "", message: "null" });
  });

  it("stays inside the backend's length limits", () => {
    const out = describeAuthError({
      code: "c".repeat(500),
      message: "m ".repeat(2000),
      stack: "s ".repeat(5000),
      blob: "b ".repeat(5000),
    });

    expect(out.code.length).toBeLessThanOrEqual(120);
    expect(out.message.length).toBeLessThanOrEqual(1000);
    expect(out.details!.length).toBeLessThanOrEqual(2000);
    expect(out.stack!.length).toBeLessThanOrEqual(2000);
  });

  it("drops details it cannot serialise instead of throwing", () => {
    const loop: Record<string, unknown> = { code: "x", message: "y" };
    loop.self = loop;

    expect(describeAuthError(loop).details).toBeUndefined();
  });
});
