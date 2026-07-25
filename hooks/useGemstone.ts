"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError, type GemstoneReportReady } from "@/lib/api";
import { nextPollDelay } from "@/lib/poll-backoff";
import { buildKey, cacheGet, cacheSet } from "@/lib/cache";
import { useAuth } from "@/providers/auth-provider";

export type GemstoneState = "idle" | "loading" | "generating" | "ready" | "forbidden" | "error";

const POLL_BASE_MS = 2500;
const POLL_TIMEOUT_MS = 90_000;

/** A gemstone report only changes on chart regeneration or a re-unlock — both explicitly purge this entry (see lib/cache.ts's purgeUserCache and its call sites). 30 days is a generous-but-bounded SWR TTL, not a correctness mechanism. */
const SWR_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Fetches (and polls until ready) the personalized gemstone report. Only runs
 * when `enabled` (i.e. the user has unlocked it) — before that the report is
 * 403 and there is nothing to poll. Re-fetches when the content language
 * changes (translate-on-read on the backend).
 *
 * Stale-while-revalidate against lib/cache.ts: on mount, a cache hit renders
 * the last-known-good report immediately (state "ready") while the poll loop
 * below still runs in the background exactly as it always has. A background
 * "generating"/"forbidden"/"failed" tick never overwrites an already-shown
 * cached report — only a fresh "ready" replaces it (and refreshes the cache).
 */
export function useGemstone(enabled: boolean) {
  const { firebaseUser, loading: authLoading, activeProfile, user } = useAuth();
  const { i18n } = useTranslation();
  const [state, setState] = useState<GemstoneState>("idle");
  const [data, setData] = useState<GemstoneReportReady | null>(null);

  useEffect(() => {
    if (authLoading || !firebaseUser || !enabled) {
      setState("idle");
      setData(null);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const cacheKey = user
      ? buildKey("gemstone", user.id, activeProfile?.id ?? "primary", i18n.language)
      : null;
    const cached = cacheKey ? cacheGet<GemstoneReportReady>(cacheKey) : null;
    if (cached) {
      setData(cached);
      setState("ready");
    } else {
      setState("loading");
      setData(null);
    }

    const deadline = Date.now() + POLL_TIMEOUT_MS;
    let attempt = 0;

    const poll = () => {
      api
        .gemstone(i18n.language)
        .then((res) => {
          if (cancelled) return;
          if (res.status === "ready") {
            setData(res);
            setState("ready");
            if (cacheKey) cacheSet(cacheKey, res, Date.now() + SWR_TTL_MS);
            return;
          }
          if (res.status === "forbidden") {
            if (!cached) setState("forbidden");
            return;
          }
          if (res.status === "failed") {
            if (!cached) setState("error");
            return;
          }
          // "generating" — keep polling until ready or timed out.
          if (!cached) setState("generating");
          const delay = nextPollDelay(attempt++, { baseMs: POLL_BASE_MS });
          if (Date.now() + delay > deadline) {
            if (!cached) setState("error");
            return;
          }
          timer = setTimeout(poll, delay);
        })
        .catch((err) => {
          if (cancelled) return;
          if (cached) return; // keep showing the cached report on a background revalidation error
          if (err instanceof ApiError && err.status === 403) setState("forbidden");
          else setState("error");
        });
    };

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [authLoading, firebaseUser, enabled, i18n.language, activeProfile?.id, user?.id]);

  return { state, data };
}
