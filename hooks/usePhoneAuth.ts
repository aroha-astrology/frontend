"use client";

import { useRef, useState } from "react";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { authErrorKey } from "@/lib/auth-errors";
import { useAuth } from "@/providers/auth-provider";

/** DOM id of the invisible reCAPTCHA host both auth pages must render. */
export const RECAPTCHA_CONTAINER_ID = "recaptcha-container";

interface SendResult {
  ok: boolean;
}
interface ConfirmResult {
  ok: boolean;
  /** True when /v1/auth/session created a brand-new user (→ onboarding). */
  created?: boolean;
}

/**
 * Encapsulates Firebase phone OTP + backend session exchange. Shared by the
 * sign-in and sign-up pages, which keep their own step/UI state and call these
 * actions. On a verification error, `errorKey` is an i18n key under `auth.`.
 */
export function usePhoneAuth() {
  const { establishSession } = useAuth();
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const confirmationRef = useRef<ConfirmationResult | null>(null);
  // Set synchronously, so a second tap that lands before React re-renders the
  // disabled button cannot start a second send.
  const sendInFlightRef = useRef(false);

  function createVerifier(): { verifier: RecaptchaVerifier; mount: HTMLElement } {
    // grecaptcha remembers every element it has rendered a widget into and
    // refuses a second one there ("reCAPTCHA has already been rendered in this
    // element"), even once the element is emptied. Firebase renders an
    // invisible verifier straight into the element it is given, so reusing the
    // host made every send after the first fail — Resend, or Send again after
    // Change number. Each verifier gets a new child of the host instead.
    const host = document.getElementById(RECAPTCHA_CONTAINER_ID);
    if (!host) throw new Error("reCAPTCHA host element is missing from the page");
    const mount = document.createElement("div");
    host.appendChild(mount);
    const verifier = new RecaptchaVerifier(getFirebaseAuth(), mount, { size: "invisible" });
    return { verifier, mount };
  }

  /** `phoneLocal` is the 10-digit national number (no +91). */
  async function sendOtp(phoneLocal: string): Promise<SendResult> {
    if (sendInFlightRef.current) return { ok: false };
    setErrorKey(null);
    const local = phoneLocal.replace(/\D/g, "").replace(/^0/, "");
    if (!/^[6-9]\d{9}$/.test(local)) {
      setErrorKey("auth.phoneError");
      return { ok: false };
    }
    sendInFlightRef.current = true;
    setSending(true);
    let recaptcha: ReturnType<typeof createVerifier> | null = null;
    try {
      recaptcha = createVerifier();
      const result = await signInWithPhoneNumber(getFirebaseAuth(), `+91${local}`, recaptcha.verifier);
      confirmationRef.current = result;
      return { ok: true };
    } catch (err) {
      setErrorKey(authErrorKey(err, "otp-send"));
      return { ok: false };
    } finally {
      // Firebase resets the verifier as the send finishes and throws
      // auth/internal-error if it was cleared first, so a verifier is only
      // ever cleared here, by the send that owns it, once that send is over.
      // This also covers the page closing mid-send. Confirming the OTP later
      // needs only the ConfirmationResult, not the verifier.
      if (recaptcha) {
        try { recaptcha.verifier.clear(); } catch { /* already cleared */ }
        recaptcha.mount.remove();
      }
      sendInFlightRef.current = false;
      setSending(false);
    }
  }

  async function confirmOtp(code: string): Promise<ConfirmResult> {
    if (!confirmationRef.current) {
      // Verify pressed with no OTP request on record. Reported like any other
      // unmapped failure — it shows the same generic message.
      const err = Object.assign(new Error("No pending OTP confirmation to verify against"), {
        code: "app/no-pending-otp",
      });
      setErrorKey(authErrorKey(err, "otp-verify"));
      return { ok: false };
    }
    setErrorKey(null);
    setVerifying(true);
    try {
      await confirmationRef.current.confirm(code);
      // Firebase user is now signed in — exchange the ID token for an app user.
      const session = await establishSession();
      return { ok: true, created: session.created };
    } catch (err) {
      setErrorKey(authErrorKey(err, "otp-verify"));
      return { ok: false };
    } finally {
      setVerifying(false);
    }
  }

  return { sendOtp, confirmOtp, errorKey, setErrorKey, sending, verifying };
}
