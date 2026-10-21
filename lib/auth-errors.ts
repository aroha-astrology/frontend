// Maps Firebase Auth error codes to i18n keys under the `auth.` namespace.
// Pass the result to t(). Falls back to a generic message.

import posthog from "posthog-js";
import { reportAuthError, type AuthStep } from "@/lib/auth-error-report";

const CODE_TO_KEY: Record<string, string> = {
  "auth/invalid-phone-number": "auth.phoneError",
  "auth/missing-phone-number": "auth.phoneError",
  "auth/invalid-verification-code": "auth.otpIncorrect",
  "auth/code-expired": "auth.otpExpired",
  "auth/too-many-requests": "auth.tooManyRequests",
  "auth/quota-exceeded": "auth.otpSendFailed",
  "auth/captcha-check-failed": "auth.recaptchaFailed",
  "auth/popup-closed-by-user": "auth.googleCancelled",
  "auth/cancelled-popup-request": "auth.googleCancelled",
  "auth/user-cancelled": "auth.googleCancelled", // native chooser dismissed (@capacitor-firebase/authentication)
  "auth/popup-blocked": "auth.googleBlocked",
  "auth/account-exists-with-different-credential": "auth.googleUnavailable",
  "auth/operation-not-allowed": "auth.googleUnavailable",
  "auth/unauthorized-domain": "auth.googleUnavailable",
};

/**
 * Returns the i18n key for a Firebase auth error (or unknown error). `step`
 * is where in sign-in it happened — it travels with the report of an
 * unmapped error, since the same code means different things at each step.
 */
export function authErrorKey(err: unknown, step: AuthStep): string {
  const code = (err as { code?: string } | null)?.code ?? "";
  const key = CODE_TO_KEY[code] ?? "auth.genericError";

  // Everything unmapped collapses into one "Something went wrong", which makes
  // every distinct failure look identical to the user AND to us. That cost
  // three days on a native Google sign-in failure (Play App Signing SHA-1 not
  // registered in Firebase → ApiException status 10) that was invisible in
  // every report and unreproducible on a locally-signed build. Report the raw
  // code so the next one is a lookup, not an investigation. No-op when the
  // user declined analytics — posthog is never init'd then.
  if (key === "auth.genericError") {
    // The same failure, in full, to the ops Telegram chat. Not analytics —
    // it names no person — so it does not wait on the analytics consent.
    reportAuthError(err, step);
  }
  if (key === "auth.genericError" && posthog.__loaded) {
    posthog.capture("auth_error_unmapped", {
      step,
      code: code || "(none)",
      // Native plugin errors put the useful detail here ("10: ..." for
      // DEVELOPER_ERROR). Firebase's own messages carry no PII; anything
      // identifying lives on customData, which we deliberately don't read.
      message: String((err as { message?: string } | null)?.message ?? "").slice(0, 200),
    });
  }

  return key;
}
