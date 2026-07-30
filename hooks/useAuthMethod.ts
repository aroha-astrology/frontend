"use client";

import { useEffect, useState } from "react";

/** Which login method to show: Firebase phone OTP (India) or Google sign-in (elsewhere). */
export type AuthMethod = "phone" | "google";

const OVERRIDE_KEY = "aroha:auth-method-override";

function readOverride(): AuthMethod | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(OVERRIDE_KEY);
  return raw === "phone" || raw === "google" ? raw : null;
}

/**
 * Decides which login method the sign-in/sign-up pages show: phone OTP in
 * India, Google sign-in everywhere else (region detected server-side via
 * `/api/region`, since IP geolocation isn't available client-side). A user
 * can override the detected method for the rest of the browser session (the
 * "wrong region?" link) — that override always wins.
 */
export function useAuthMethod() {
  const [detected, setDetected] = useState<AuthMethod | null>(null);
  const [override, setOverrideState] = useState<AuthMethod | null>(() => readOverride());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/region")
      .then((res) => res.json())
      .then((data: { method: AuthMethod }) => {
        if (!cancelled) setDetected(data.method);
      })
      .catch(() => {
        if (!cancelled) setDetected("phone"); // safe default, matches the server-side fallback
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function setOverride(method: AuthMethod | null) {
    setOverrideState(method);
    if (typeof window === "undefined") return;
    if (method) sessionStorage.setItem(OVERRIDE_KEY, method);
    else sessionStorage.removeItem(OVERRIDE_KEY);
  }

  const method = override ?? detected;

  return { method, loading: loading && override === null, setOverride };
}
