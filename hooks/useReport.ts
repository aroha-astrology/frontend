"use client";

import { useEffect, useState } from "react";
import { reportsApi, type ReportDetailResult } from "@/lib/reports-api";
import { nextPollDelay } from "@/lib/poll-backoff";
import { buildKey, cacheGet, cacheSet } from "@/lib/cache";
import { useAuth } from "@/providers/auth-provider";

export type ReportViewState = "idle" | "loading" | "generating" | "ready" | "failed" | "error";

export type ReportReady = Extract<ReportDetailResult, { status: "ready" }>;

const POLL_BASE_MS = 2500;
const POLL_TIMEOUT_MS = 200_000;

/** A ready report's content for a given language never changes once generated (translate-on-read + cache on the backend) — see lib/cache.ts's module doc for why this is a generous-but-bounded SWR TTL, not a correctness mechanism. */
const SWR_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Fetches (and polls until ready) a single purchased report by id — same
 * shape as hooks/useGemstone.ts's poll loop. Only runs when `id` isn't null
 * (the catalogue page passes null before a purchase/selection exists).
 * Re-fetches when the content language changes (translate-on-read on the
 * backend), matching every other translated-content hook's `i18n.language`
 * dependency.
 *
 * Stale-while-revalidate against lib/cache.ts: on mount, a cache hit renders
 * the last-known-good report immediately (state "ready") while the poll loop
 * still runs in the background. A background "generating"/"failed" tick
 * never overwrites an already-shown cached report — only a fresh "ready"
 * replaces it (and refreshes the cache).
 *
 * `retry()` restarts the whole poll loop (fresh deadline, fresh attempt
 * counter) after a timeout ("error" state) without needing to change route —
 * it just bumps an internal counter that's part of the effect's dependency
 * array, which re-runs the effect from scratch.
 */
/** `state`/`data`/`failedError` as one object, set with a single setState call at every
 * transition — two separate calls (setData then setState) could in principle leave a render
 * observing "ready" with no data yet (or vice versa), which app/reports/[id]/page.tsx's
 * state-keyed branches have no fallback for, so the whole page would render blank. See
 * page.tsx's own trailing `else` fallback for the second line of defense. */
interface ReportView {
  state: ReportViewState;
  data: ReportReady | null;
  failedError: string | null;
}

export function useReport(id: string | null, language: string) {
  const { firebaseUser, loading: authLoading, user } = useAuth();
  const [view, setView] = useState<ReportView>({ state: "idle", data: null, failedError: null });
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (authLoading || !firebaseUser || id === null) {
      setView({ state: "idle", data: null, failedError: null });
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const cacheKey = user ? buildKey("report", user.id, id, language) : null;
    const cached = cacheKey ? cacheGet<ReportReady>(cacheKey) : null;
    if (cached) {
      setView({ state: "ready", data: cached, failedError: null });
    } else {
      setView({ state: "loading", data: null, failedError: null });
    }

    const deadline = Date.now() + POLL_TIMEOUT_MS;
    let attempt = 0;

    const poll = () => {
      reportsApi
        .get(id, language)
        .then((res) => {
          if (cancelled) return;
          if (res.status === "ready") {
            setView({ state: "ready", data: res, failedError: null });
            if (cacheKey) cacheSet(cacheKey, res, Date.now() + SWR_TTL_MS);
            return;
          }
          if (res.status === "failed") {
            if (!cached) setView({ state: "failed", data: null, failedError: res.error });
            return;
          }
          // "generating" — keep polling until ready/failed or timed out.
          if (!cached) setView((v) => ({ ...v, state: "generating" }));
          const delay = nextPollDelay(attempt++, { baseMs: POLL_BASE_MS });
          if (Date.now() + delay > deadline) {
            if (!cached) setView((v) => ({ ...v, state: "error" }));
            return;
          }
          timer = setTimeout(poll, delay);
        })
        .catch(() => {
          if (cancelled) return;
          if (cached) return; // keep showing the cached report on a background revalidation error
          setView((v) => ({ ...v, state: "error" }));
        });
    };

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [authLoading, firebaseUser, id, language, user?.id, retryCount]);

  const retry = () => setRetryCount((c) => c + 1);

  return { ...view, retry };
}
