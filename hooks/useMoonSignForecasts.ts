"use client";

import { useEffect, useState } from "react";
import { zodiac } from "@/data/zodiac";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { useTranslation } from "react-i18next";
import { forecastToRating, forecastToText, type ForecastData, type SignForecast, type Timescale } from "@/components/horoscope/types";
import { buildKey, cacheGet, cacheSet } from "@/lib/cache";
import { currentPeriodKey, periodExpiresAt } from "@/lib/period-expiry";

const FALLBACK_TEXT = "Cosmic energies align for you today.";

/** Shape of a single sign's raw API response — same for every consumer of api.moonSignForecast. */
type MoonSignForecastResponse = Awaited<ReturnType<typeof api.moonSignForecast>>;

function fallbackForecasts(): SignForecast[] {
  return zodiac.map((sign) => ({
    name: sign.name,
    dates: sign.dates,
    symbol: sign.symbol,
    rating: 3,
    text: FALLBACK_TEXT,
    raw: null,
  }));
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
          if (result.status === "fulfilled") {
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
          return {
            name: sign.name,
            dates: sign.dates,
            symbol: sign.symbol,
            rating: 3,
            text: FALLBACK_TEXT,
            raw: null,
          };
        });

        setForecasts(items);
      } catch {
        setForecasts(fallbackForecasts());
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAll();
    return () => { cancelled = true; };
  }, [authLoading, firebaseUser, enabled, period, i18n.language]);

  return { forecasts, loading };
}
