"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { weatherApi, type AstroWeather } from "@/lib/insights-api";
import { useAuth } from "@/providers/auth-provider";

type Entry = { at: number; promise: Promise<AstroWeather> };
/** Home shows two cards off the same endpoint; they share one request for a few minutes. */
const cache = new Map<string, Entry>();
const TTL_MS = 5 * 60_000;

export type WeatherState =
  | { status: "loading" }
  | { status: "ready"; data: AstroWeather }
  | { status: "notReady" }
  | { status: "error" };

/** Astro Weather for `date` (default today). `enabled` false = don't fetch at all. */
export function useAstroWeather(enabled: boolean, date?: string): WeatherState {
  const { user, activeProfile } = useAuth();
  const [state, setState] = useState<WeatherState>({ status: "loading" });
  const key = `${user?.id ?? ""}:${activeProfile?.id ?? "primary"}:${date ?? "today"}`;
  const signedIn = Boolean(user);

  useEffect(() => {
    if (!enabled || !signedIn) return;
    let cancelled = false;
    let entry = cache.get(key);
    if (!entry || Date.now() - entry.at > TTL_MS) {
      entry = { at: Date.now(), promise: weatherApi.get(date) };
      cache.set(key, entry);
      entry.promise.catch(() => cache.delete(key));
    }
    entry.promise
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({ status: err instanceof ApiError && err.message === "CHART_NOT_READY" ? "notReady" : "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, signedIn, key, date]);

  return state;
}
