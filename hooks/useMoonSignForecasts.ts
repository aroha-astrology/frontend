"use client";

import { useEffect, useState } from "react";
import { zodiac } from "@/data/zodiac";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { useTranslation } from "react-i18next";
import { forecastToRating, forecastToText, type ForecastData, type SignForecast, type Timescale } from "@/components/horoscope/types";
import { buildKey, cacheGet, cacheSet } from "@/lib/cache";
import { currentPeriodKey, periodExpiresAt } from "@/lib/period-expiry";

/** Shape of a single sign's raw API response — same for every consumer of api.moonSignForecast. */
type MoonSignForecastResponse = Awaited<ReturnType<typeof api.moonSignForecast>>;

/** A sign whose reading didn't load. No invented text or rating: the card says so and offers a retry. */
function failedForecast(sign: (typeof zodiac)[number]): SignForecast {
  return { name: sign.name, dates: sign.dates, symbol: sign.symbol, rating: 0, text: "", raw: null, failed: true };
}

/**
 * This endpoint is user-independent — the same forecast is served to every
 * user for a given (sign, period, periodKey, language), so the cache key
 * deliberately carries no userId/profile. Hard-cached (see lib/cache.ts):
 * once a (sign, period)'s current-period reading is cached, it costs zero
 * network until the period rolls over.
 */
function cacheKeyFor(lang: string, signIndex: number, period: Timescale): string {
  return buildKey("moonSignForecast", lang, signIndex, period, currentPeriodKey(period));
}

/**
 * Fetches all 12 moon-sign forecasts for a given timescale, shared by the
 * home slider and the /horoscope page.
 *
 * `enabled` defaults to `true` — HoroscopeSlider (Home) passes
 * `useFeature('home.horoscopeSlider').enabled`, the /horoscope page passes
 * `useFeature('nav.horoscope').enabled` instead (different flag). When
 * disabled, resets to an empty/non-loading state and skips the fetch effect
 * entirely, matching useGemstone's pattern.
 */
export function useMoonSignForecasts(period: Timescale = "daily", enabled: boolean = true) {
  const { i18n } = useTranslation();
  const { firebaseUser, loading: authLoading } = useAuth();
  const [forecasts, setForecasts] = useState<SignForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (authLoading || !firebaseUser) return;
    if (!enabled) {
      setForecasts([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    async function fetchAll() {
      try {
        const results = await Promise.allSettled(
          zodiac.map((sign) => {
            const key = cacheKeyFor(i18n.language, sign.index, period);
            const cached = cacheGet<MoonSignForecastResponse>(key);
            if (cached) return Promise.resolve(cached);
            return api.moonSignForecast(sign.index, period, i18n.language).then((res) => {
              // The endpoint has no pending/failed shape — every resolved
              // response is a terminal success, safe to cache unconditionally.
              cacheSet(key, res, periodExpiresAt(period));
              return res;
            });
          }),
        );

        if (cancelled) return;

        const items: SignForecast[] = results.map((result, i) => {
          const sign = zodiac[i]!;
          if (result.status === "fulfilled" && result.value.forecast) {
            const forecast = result.value.forecast;
            return {
              name: sign.name,
              dates: sign.dates,
              symbol: sign.symbol,
              rating: forecastToRating(forecast),
              text: forecastToText(forecast),
              raw: forecast as ForecastData | null,
            };
          }
          return failedForecast(sign);
        });

        setForecasts(items);
      } catch {
        setForecasts(zodiac.map(failedForecast));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAll();
    return () => { cancelled = true; };
  }, [authLoading, firebaseUser, enabled, period, i18n.language, retryCount]);

  /** Refetches every sign that isn't cached yet — i.e. the ones that failed. */
  const retry = () => setRetryCount((n) => n + 1);
  const allFailed = forecasts.length > 0 && forecasts.every((f) => f.failed);

  return { forecasts, loading, allFailed, retry };
}
