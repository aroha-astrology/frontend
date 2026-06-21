"use client";

import { useEffect, useRef, useState } from "react";
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
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  function resetRecaptcha() {
    if (recaptchaRef.current) {
      try { recaptchaRef.current.clear(); } catch { /* ignore stale verifier */ }
      recaptchaRef.current = null;
    }
    // grecaptcha tracks widgets by element id; clear any stale iframe first.
    const el = typeof document !== "undefined"
      ? document.getElementById(RECAPTCHA_CONTAINER_ID)
      : null;
    if (el) el.innerHTML = "";
  }

  function initRecaptcha() {
    resetRecaptcha();
    recaptchaRef.current = new RecaptchaVerifier(getFirebaseAuth(), RECAPTCHA_CONTAINER_ID, {
      size: "invisible",
    });
  }

  useEffect(() => resetRecaptcha, []);

  /** `phoneLocal` is the 10-digit national number (no +91). */
  async function sendOtp(phoneLocal: string): Promise<SendResult> {
    setErrorKey(null);
    const local = phoneLocal.replace(/\D/g, "").replace(/^0/, "");
    if (!/^[6-9]\d{9}$/.test(local)) {
      setErrorKey("auth.phoneError");
      return { ok: false };
    }
    setSending(true);
    try {
      initRecaptcha();
      const result = await signInWithPhoneNumber(getFirebaseAuth(), `+91${local}`, recaptchaRef.current!);
      confirmationRef.current = result;
      return { ok: true };
    } catch (err) {
      setErrorKey(authErrorKey(err));
      resetRecaptcha();
      return { ok: false };
    } finally {
      setSending(false);
    }
  }

  async function confirmOtp(code: string): Promise<ConfirmResult> {
    if (!confirmationRef.current) {
      setErrorKey("auth.genericError");
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
      setErrorKey(authErrorKey(err));
      return { ok: false };
    } finally {
      setVerifying(false);
    }
  }

  return { sendOtp, confirmOtp, errorKey, setErrorKey, sending, verifying };
}
