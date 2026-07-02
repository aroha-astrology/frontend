"use client";

import { useEffect, useState } from "react";
import { zodiac } from "@/data/zodiac";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { forecastToRating, forecastToText, type ForecastData, type SignForecast, type Timescale } from "@/components/horoscope/types";

const FALLBACK_TEXT = "Cosmic energies align for you today.";

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

/** Fetches all 12 moon-sign forecasts for a given timescale, shared by the home slider and the /horoscope page. */
export function useMoonSignForecasts(period: Timescale = "daily") {
  const { firebaseUser, loading: authLoading } = useAuth();
  const [forecasts, setForecasts] = useState<SignForecast[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !firebaseUser) return;
    let cancelled = false;
    setLoading(true);

    async function fetchAll() {
      try {
        const results = await Promise.allSettled(
          zodiac.map((sign) => api.moonSignForecast(sign.index, period)),
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
  }, [authLoading, firebaseUser, period]);

  return { forecasts, loading };
}
