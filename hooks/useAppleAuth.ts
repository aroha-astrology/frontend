"use client";

import { useState } from "react";
import {
  OAuthProvider,
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

/** True on Android/iOS builds where Apple's OAuth pages block the embedded WebView. */
async function isNativePlatform(): Promise<boolean> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * Encapsulates Apple sign-in + backend session exchange, mirroring
 * useGoogleAuth's shape exactly. Shown only on iOS — it exists to satisfy App
 * Store guideline 4.8 (an app offering Google sign-in must offer Apple too),
 * not as a general-purpose login method for other platforms.
 *
 * Same native/web split as Google: the WebView blocks Apple's OAuth pages,
 * so native builds mint credentials via the native Apple sign-in sheet and
 * hand the resulting ID token + nonce to the Firebase JS SDK running in the
 * webview (`skipNativeAuth: true` on this call only, matching Apple's
 * documented @capacitor-firebase/authentication pattern).
 */
export function useAppleAuth() {
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
        const result = await FirebaseAuthentication.signInWithApple({
          skipNativeAuth: true,
        });
        const idToken = result.credential?.idToken;
        if (!idToken) {
          const err = new Error("Native Apple sign-in returned no ID token") as Error & {
            code: string;
          };
          err.code = "auth/internal-error";
          throw err;
        }
        const provider = new OAuthProvider("apple.com");
        const credential = provider.credential({
          idToken,
          rawNonce: result.credential?.nonce,
        });
        await signInWithCredential(getFirebaseAuth(), credential);
      } else {
        await signInWithPopup(getFirebaseAuth(), new OAuthProvider("apple.com"));
      }
      const session = await establishSession();
      return { ok: true, created: session.created };
    } catch (err) {
      setErrorKey(authErrorKey(err));
      return { ok: false };
    } finally {
      setBusy(false);
    }
  }

  return { signIn, errorKey, setErrorKey, busy };
}
