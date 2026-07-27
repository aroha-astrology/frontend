"use client";

import { useEffect, useState } from "react";
import { palmApi, type PalmReadingResponse } from "@/lib/palm-api";
import { nextPollDelay } from "@/lib/poll-backoff";
import { buildKey, cacheGet, cacheSet } from "@/lib/cache";
import { useAuth } from "@/providers/auth-provider";

export type PalmViewState = "idle" | "loading" | "generating" | "ready" | "failed" | "error";

const POLL_BASE_MS = 2500;
const POLL_TIMEOUT_MS = 200_000;
/** A ready reading's content for a given language never changes once generated
 * (translate-on-read + cache on the backend) — same SWR rationale as useReport.ts. */
const SWR_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Poll-until-ready hook for a single palm reading — same shape as
 * hooks/useReport.ts (stale-while-revalidate cache hit renders immediately
 * while the poll loop still runs; `retry()` restarts the whole loop after a
 * timeout). Re-fetches when `language` changes (translate-on-read backend).
 */
export function usePalmReading(id: string | null, language: string) {
  const { firebaseUser, loading: authLoading, user } = useAuth();
  const [state, setState] = useState<PalmViewState>("idle");
  const [data, setData] = useState<PalmReadingResponse | null>(null);
  const [failedError, setFailedError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (authLoading || !firebaseUser || id === null) {
      setState("idle");
      setData(null);
      setFailedError(null);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const cacheKey = user ? buildKey("palm", user.id, id, language) : null;
    const cached = cacheKey ? cacheGet<PalmReadingResponse>(cacheKey) : null;
    if (cached) {
      setData(cached);
      setState("ready");
    } else {
      setState("loading");
      setData(null);
    }
    setFailedError(null);

    const deadline = Date.now() + POLL_TIMEOUT_MS;
    let attempt = 0;

    const poll = () => {
      palmApi
        .get(id, language)
        .then((res) => {
          if (cancelled) return;
          if (res.status === "ready") {
            setData(res);
            setState("ready");
            if (cacheKey) cacheSet(cacheKey, res, Date.now() + SWR_TTL_MS);
            return;
          }
          if (res.status === "observed") {
            // Terminal for THIS poll loop (the free scan is done — teaser is viewable), but
            // deliberately NOT cached: unlocking transitions this same id to 'generating' then
            // 'ready', and the report page calls retry() right after a successful unlock to
            // restart polling from scratch rather than trusting a stale cached teaser.
            setData(res);
            setState("ready");
            return;
          }
          if (res.status === "failed") {
            if (!cached) {
              setState("failed");
              setFailedError(res.error ?? null);
            }
            return;
          }
          // "pending" or "generating" — keep polling until ready/observed/failed or timed out.
          if (!cached) setState("generating");
          const delay = nextPollDelay(attempt++, { baseMs: POLL_BASE_MS });
          if (Date.now() + delay > deadline) {
            if (!cached) setState("error");
            return;
          }
          timer = setTimeout(poll, delay);
        })
        .catch(() => {
          if (cancelled) return;
          if (cached) return;
          setState("error");
        });
    };

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [authLoading, firebaseUser, id, language, user?.id, retryCount]);

  const retry = () => setRetryCount((c) => c + 1);

  return { state, data, failedError, retry };
}
