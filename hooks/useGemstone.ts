"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError, type GemstoneReportReady } from "@/lib/api";
import { nextPollDelay } from "@/lib/poll-backoff";
import { useAuth } from "@/providers/auth-provider";

export type GemstoneState = "idle" | "loading" | "generating" | "ready" | "forbidden" | "error";

const POLL_BASE_MS = 2500;
const POLL_TIMEOUT_MS = 90_000;

/**
 * Fetches (and polls until ready) the personalized gemstone report. Only runs
 * when `enabled` (i.e. the user has unlocked it) — before that the report is
 * 403 and there is nothing to poll. Re-fetches when the content language
 * changes (translate-on-read on the backend).
 */
export function useGemstone(enabled: boolean) {
  const { firebaseUser, loading: authLoading, activeProfile } = useAuth();
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
    setState("loading");
    setData(null);

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
            return;
          }
          if (res.status === "forbidden") {
            setState("forbidden");
            return;
          }
          if (res.status === "failed") {
            setState("error");
            return;
          }
          // "generating" — keep polling until ready or timed out.
          setState("generating");
          const delay = nextPollDelay(attempt++, { baseMs: POLL_BASE_MS });
          if (Date.now() + delay > deadline) {
            setState("error");
            return;
          }
          timer = setTimeout(poll, delay);
        })
        .catch((err) => {
          if (cancelled) return;
          if (err instanceof ApiError && err.status === 403) setState("forbidden");
          else setState("error");
        });
    };

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [authLoading, firebaseUser, enabled, i18n.language, activeProfile?.id]);

  return { state, data };
}
