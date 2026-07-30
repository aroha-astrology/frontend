// Maps Firebase Auth error codes to i18n keys under the `auth.` namespace.
// Pass the result to t(). Falls back to a generic message.

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

/** Returns the i18n key for a Firebase auth error (or unknown error). */
export function authErrorKey(err: unknown): string {
  const code = (err as { code?: string } | null)?.code ?? "";
  return CODE_TO_KEY[code] ?? "auth.genericError";
}
