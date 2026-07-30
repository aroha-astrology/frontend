"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, type Kundli, type KundliResponse } from "@/lib/api";
import { nextPollDelay } from "@/lib/poll-backoff";
import { buildKey, cacheGet, cacheSet } from "@/lib/cache";
import { useAuth } from "@/providers/auth-provider";

/** A natal chart never changes on its own — only an explicit birth-detail edit or regenerate invalidates it (see lib/cache.ts's purgeUserCache and its call sites). 7 days is a generous-but-bounded SWR TTL, not a correctness mechanism. */
const SWR_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Stale-while-revalidate against lib/cache.ts: on mount, a cache hit renders
 * the last-known-good kundli immediately (zero loading spinner) while the
 * poll loop below still runs in the background exactly as it always has and
 * reconciles state + cache once it resolves. A background "pending"/
 * "generating" tick never overwrites the already-displayed cached kundli —
 * only a final "ready" does. `kundli`/`error`/`missing_parameters` outcomes
 * still behave exactly as before when there was no cache hit to begin with.
 *
 * `enabled` defaults to `true` so every existing call site keeps fetching
 * unconditionally unless a caller opts out (see hooks/useFeature.ts) — e.g.
 * Home's KundliCard passing `useFeature('home.kundliCard').enabled` for
 * itself, while HoroscopeSlider/ChatConversation/the kundli page keep
 * fetching regardless of that flag, since they depend on kundli data for
 * their own separate, non-toggled features (see admin-reports-dashboard's
 * report for the full reasoning).
 */
export function useKundli(enabled: boolean = true) {
  const { user, activeProfile } = useAuth();
  const { i18n } = useTranslation();
  const language = i18n.language;
  const [kundli, setKundli] = useState<Kundli | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cancelled = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    cancelled.current = false;
    if (timer.current) clearTimeout(timer.current);

    if (!enabled) {
      setKundli(null);
      setLoading(false);
      setError(null);
      return;
    }

    let attempt = 0;

    const cacheKey = user ? buildKey("kundli", user.id, activeProfile?.id ?? "primary", language) : null;
    const cached = cacheKey ? cacheGet<Kundli>(cacheKey) : null;
    if (cached) {
      setKundli(cached);
      setLoading(false);
    }

    async function poll() {
      if (cancelled.current) return;
      try {
        const result: KundliResponse = await api.getKundli(language);
        if (cancelled.current) return;

        if (result.status === "ready") {
          setKundli(result as Kundli);
          setLoading(false);
          if (cacheKey) cacheSet(cacheKey, result as Kundli, Date.now() + SWR_TTL_MS);
        } else if (result.status === "pending" || result.status === "generating") {
          timer.current = setTimeout(poll, nextPollDelay(attempt++));
        } else if (result.status === "failed") {
          // Keep showing a last-known-good cached kundli if we have one —
          // surface the error alongside it rather than blanking a valid chart.
          setError(result.message ?? "Kundli generation failed");
          setLoading(false);
        } else if (result.status === "missing_parameters") {
          setError(null);
          setKundli(null);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled.current) {
          setError(err instanceof Error ? err.message : "Failed to fetch kundli");
          setLoading(false);
        }
      }
    }

    poll();

    return () => {
      cancelled.current = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [enabled, activeProfile?.id, user?.id, language]);

  return { kundli, loading, error };
}
