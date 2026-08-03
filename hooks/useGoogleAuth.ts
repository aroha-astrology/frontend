"use client";

import { useState } from "react";
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { authErrorKey } from "@/lib/auth-errors";
import { useAuth } from "@/providers/auth-provider";

interface SignInResult {
  ok: boolean;
  /** True when /v1/auth/session created a brand-new user (→ onboarding). */
  created?: boolean;
}

/** True on Android/iOS builds where Google's OAuth pages block the embedded WebView. */
async function isNativePlatform(): Promise<boolean> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * Encapsulates Google sign-in + backend session exchange, mirroring
 * usePhoneAuth's shape so the auth pages treat both methods symmetrically.
 *
 * Web uses the Firebase JS SDK popup flow directly. The Capacitor shell is a
 * WebView loading the deployed site — Google blocks its OAuth pages inside
 * embedded WebViews — so native builds mint credentials via the native
 * account chooser (`@capacitor-firebase/authentication`) and hand the
 * resulting ID token to the same Firebase JS SDK session running in the
 * webview (`skipNativeAuth: true` passed on this call only — the phone
 * provider keeps the plugin's default native-intercept behavior, see
 * capacitor.config.ts), so every other part of the app keeps reading auth
 * off `getFirebaseAuth().currentUser` unchanged.
 */
export function useGoogleAuth() {
  const { establishSession } = useAuth();
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn(): Promise<SignInResult> {
    setErrorKey(null);
    setBusy(true);
    try {
      if (await isNativePlatform()) {
        const { FirebaseAuthentication } = await import(
          "@capacitor-firebase/authentication"
        );
        const result = await FirebaseAuthentication.signInWithGoogle({
          skipNativeAuth: true,
        });
        const idToken = result.credential?.idToken;
        if (!idToken) {
          const err = new Error("Native Google sign-in returned no ID token") as Error & {
            code: string;
          };
          err.code = "auth/internal-error";
          throw err;
        }
        const credential = GoogleAuthProvider.credential(idToken);
        await signInWithCredential(getFirebaseAuth(), credential);
      } else {
        await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());
      }
      const session = await establishSession();
      return { ok: true, created: session.created };
    } catch (err) {
      console.error("Google sign-in failed", err);
      setErrorKey(authErrorKey(err));
      return { ok: false };
    } finally {
      setBusy(false);
    }
  }

  return { signIn, errorKey, setErrorKey, busy };
}
