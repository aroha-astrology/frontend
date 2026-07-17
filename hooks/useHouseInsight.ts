"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError, type HouseInsightResult } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";

export type HouseInsightState = "loading" | "generating" | "ready" | "forbidden" | "empty" | "error";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 60_000;

/**
 * Fetches (and polls until ready) the personalized insight for one kundli
 * house. `house` is null while the drawer is closed / no house selected —
 * the effect no-ops in that case so opening/closing the drawer doesn't spam
 * requests for a house nobody is looking at.
 */
export function useHouseInsight(house: number | null) {
  const { firebaseUser, loading: authLoading } = useAuth();
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
    setState("loading");
    setData(null);

    const deadline = Date.now() + POLL_TIMEOUT_MS;

    const poll = () => {
      api
        .houseInsight(house, i18n.language)
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
          // res.status === "generating" — keep polling until ready or timed out.
          setState("generating");
          if (Date.now() + POLL_INTERVAL_MS > deadline) {
            setState("empty");
            return;
          }
          timer = setTimeout(poll, POLL_INTERVAL_MS);
        })
        .catch((err) => {
          if (cancelled) return;
          if (err instanceof ApiError && err.status === 404) setState("empty");
          else setState("error");
        });
    };

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [authLoading, firebaseUser, house, i18n.language]);

  return { state, data };
}
