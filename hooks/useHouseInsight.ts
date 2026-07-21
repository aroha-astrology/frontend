"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError, type HouseInsightReady, type HouseInsightResult } from "@/lib/api";
import { nextPollDelay } from "@/lib/poll-backoff";
import { buildKey, cacheGet, cacheSet } from "@/lib/cache";
import { useAuth } from "@/providers/auth-provider";

export type HouseInsightState = "loading" | "generating" | "ready" | "forbidden" | "empty" | "error";

const POLL_TIMEOUT_MS = 60_000;

/** A house insight only changes on chart regeneration or that house's own unlock — both explicitly purge this entry (see lib/cache.ts's purgeUserCache and its call sites). 30 days is a generous-but-bounded SWR TTL, not a correctness mechanism. */
const SWR_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Fetches (and polls until ready) the personalized insight for one kundli
 * house. `house` is null while the drawer is closed / no house selected —
 * the effect no-ops in that case so opening/closing the drawer doesn't spam
 * requests for a house nobody is looking at.
 *
 * Stale-while-revalidate against lib/cache.ts: on mount, a cache hit renders
 * the last-known-good insight immediately (state "ready") while the poll
 * loop below still runs in the background exactly as it always has. A
 * background "generating"/"forbidden"/"failed" tick never overwrites an
 * already-shown cached insight — only a fresh "ready" replaces it (and
 * refreshes the cache).
 */
export function useHouseInsight(house: number | null) {
  const { firebaseUser, loading: authLoading, activeProfile, user } = useAuth();
  const { i18n } = useTranslation();
  const [state, setState] = useState<HouseInsightState>("loading");
  const [data, setData] = useState<HouseInsightResult | null>(null);

  useEffect(() => {
    if (authLoading || !firebaseUser || house == null) {
      setState("loading");
      setData(null);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const cacheKey = user
      ? buildKey("houseInsight", user.id, activeProfile?.id ?? "primary", i18n.language, house)
      : null;
    const cached = cacheKey ? cacheGet<HouseInsightReady>(cacheKey) : null;
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
        .houseInsight(house, i18n.language)
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
          // res.status === "generating" — keep polling until ready or timed out.
          if (!cached) setState("generating");
          const delay = nextPollDelay(attempt++);
          if (Date.now() + delay > deadline) {
            if (!cached) setState("empty");
            return;
          }
          timer = setTimeout(poll, delay);
        })
        .catch((err) => {
          if (cancelled) return;
          if (cached) return; // keep showing the cached insight on a background revalidation error
          if (err instanceof ApiError && err.status === 404) setState("empty");
          else setState("error");
        });
    };

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [authLoading, firebaseUser, house, i18n.language, activeProfile?.id, user?.id]);

  return { state, data };
}
