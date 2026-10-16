"use client";

import { useEffect, useState } from "react";
import { useNewFeature } from "@/hooks/useFeature";
import { passApi, type PassStatus } from "@/lib/pass-api";
import { useAuth } from "@/providers/auth-provider";

/**
 * The signed-in user's Aroha Pass status, shared by everything that shows it
 * (the top-bar chip, the menu, every Pass lock, the launch popup, the report
 * price steps). One request serves them all: the answer is kept for a minute
 * per user, and `refreshPassStatus()` drops it after a purchase so every
 * mounted reader loads the new one.
 */
const FRESH_MS = 60_000;

let cached: { userId: string; at: number; promise: Promise<PassStatus> } | null = null;
const listeners = new Set<() => void>();

function load(userId: string): Promise<PassStatus> {
  if (cached && cached.userId === userId && Date.now() - cached.at < FRESH_MS) return cached.promise;
  const promise = passApi.status();
  cached = { userId, at: Date.now(), promise };
  // A failed load must not be served again for a minute.
  promise.catch(() => {
    if (cached?.promise === promise) cached = null;
  });
  return promise;
}

/** Call after anything that changes the Pass (a purchase, an upgrade, a restore). */
export function refreshPassStatus(): void {
  cached = null;
  listeners.forEach((fn) => fn());
}

/**
 * `undefined` while loading; `null` when there is nothing to show (the Pass is
 * off for this user, they are signed out, or the request failed).
 */
export function usePassStatus(): PassStatus | null | undefined {
  const { user } = useAuth();
  const { enabled } = useNewFeature("nav.arohaPass");
  const userId = user?.id;
  const [status, setStatus] = useState<PassStatus | null | undefined>(undefined);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const bump = () => setNonce((n) => n + 1);
    listeners.add(bump);
    return () => {
      listeners.delete(bump);
    };
  }, []);

  useEffect(() => {
    if (!enabled || !userId) {
      setStatus(null);
      return;
    }
    let live = true;
    load(userId)
      .then((s) => live && setStatus(s))
      .catch(() => live && setStatus(null));
    return () => {
      live = false;
    };
  }, [enabled, userId, nonce]);

  return status;
}
