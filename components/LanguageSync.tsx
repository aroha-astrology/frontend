"use client";

import { useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";

const SYNCED_KEY = "aroha:lang-synced";

/**
 * The app language lives in localStorage, so the server never learned it and the
 * admin language breakdown had nothing to count. This saves it to the profile once
 * per (user, language) — on first open after sign-in and again whenever it changes.
 * Best effort: a failed save is retried on the next open.
 */
export function LanguageSync() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!userId) return;
    const marker = `${userId}:${lang}`;
    try {
      if (window.localStorage.getItem(SYNCED_KEY) === marker) return;
    } catch {
      // storage blocked — just save again
    }
    api
      .updateMe({ contentLanguage: lang })
      .then(() => {
        try {
          window.localStorage.setItem(SYNCED_KEY, marker);
        } catch {
          // ignore
        }
      })
      .catch(() => {});
  }, [userId, lang]);

  return null;
}
