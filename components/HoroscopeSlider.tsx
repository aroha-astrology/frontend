"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { zodiac } from "@/data/zodiac";
import { api } from "@/lib/api";
import Card from "@/components/ui/Card";

interface SignForecast {
  name: string;
  dates: string;
  symbol: string;
  rating: number;
  text: string;
}

/**
 * Convert a forecast response into a star rating (1-5).
 * Looks for score/rating fields, quality keywords, or defaults to 3.
 */
function forecastToRating(forecast: unknown): number {
  if (forecast == null) return 3;

  if (typeof forecast === "object" && forecast !== null) {
    const f = forecast as Record<string, unknown>;
    // Check for an explicit score or rating field
    if (typeof f.score === "number") return Math.min(5, Math.max(1, Math.round(f.score)));
    if (typeof f.rating === "number") return Math.min(5, Math.max(1, Math.round(f.rating)));
    if (typeof f.overall === "number") return Math.min(5, Math.max(1, Math.round(f.overall)));

    // Check for quality string
    const quality = String(f.quality ?? f.mood ?? "").toLowerCase();
    if (quality.includes("excellent") || quality.includes("great")) return 5;
    if (quality.includes("good") || quality.includes("favorable")) return 4;
    if (quality.includes("moderate") || quality.includes("mixed")) return 3;
    if (quality.includes("challenging") || quality.includes("difficult")) return 2;
    if (quality.includes("avoid") || quality.includes("unfavorable")) return 1;
  }

  return 3;
}

/** Extract a text summary from the forecast response. */
function forecastToText(forecast: unknown): string {
  if (typeof forecast === "string") return forecast;
  if (forecast == null) return "Cosmic energies align for you today.";

  if (typeof forecast === "object" && forecast !== null) {
    const f = forecast as Record<string, unknown>;
    if (typeof f.summary === "string") return f.summary;
    if (typeof f.text === "string") return f.text;
    if (typeof f.description === "string") return f.description;
    if (typeof f.forecast === "string") return f.forecast;
    if (typeof f.prediction === "string") return f.prediction;
    // If there are array predictions, join them
    if (Array.isArray(f.predictions) && f.predictions.length > 0) {
      return String(f.predictions[0]);
    }
  }

  return "The stars hold guidance for you today.";
}

function SkeletonCard() {
  return (
    <Card className="min-w-[160px] max-w-[160px] p-4 border-gold/10 flex-shrink-0 animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-gold/10" />
        <div className="space-y-1.5">
          <div className="h-3 w-14 rounded bg-gold/10" />
          <div className="h-2 w-20 rounded bg-gold/5" />
        </div>
      </div>
      <div className="flex gap-0.5 mb-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="w-2.5 h-2.5 rounded-full bg-gold/10" />
        ))}
      </div>
      <div className="space-y-1">
        <div className="h-2 w-full rounded bg-gold/5" />
        <div className="h-2 w-3/4 rounded bg-gold/5" />
      </div>
    </Card>
  );
}

export default function HoroscopeSlider() {
  const [forecasts, setForecasts] = useState<SignForecast[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      try {
        const results = await Promise.allSettled(
          zodiac.map((sign) => api.moonSignForecast(sign.index)),
        );

        if (cancelled) return;

        const items: SignForecast[] = results.map((result, i) => {
          const sign = zodiac[i];
          if (result.status === "fulfilled") {
            const forecast = result.value.forecast;
            return {
              name: sign.name,
              dates: sign.dates,
              symbol: sign.symbol,
              rating: forecastToRating(forecast),
              text: forecastToText(forecast),
            };
          }
          // Fallback for rejected requests
          return {
            name: sign.name,
            dates: sign.dates,
            symbol: sign.symbol,
            rating: 3,
            text: "Cosmic energies align for you today.",
          };
        });

        setForecasts(items);
      } catch {
        // If everything fails, show static fallback
        setForecasts(
          zodiac.map((sign) => ({
            name: sign.name,
            dates: sign.dates,
            symbol: sign.symbol,
            rating: 3,
            text: "Cosmic energies align for you today.",
          })),
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAll();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide pr-5">
        {[...Array(5)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide pr-5">
      {forecasts.map((sign, index) => (
        <Card
          key={sign.name}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className="min-w-[160px] max-w-[160px] p-4 border-gold/10 hover:border-gold/30 flex-shrink-0"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full border border-gold/40 flex items-center justify-center text-gold drop-shadow-[0_0_5px_rgba(223,181,100,0.3)]">
              <span className="text-lg">{sign.symbol}</span>
            </div>
            <div>
              <h3 className="text-foreground text-sm font-semibold tracking-wide font-display">
                {sign.name}
              </h3>
              <p className="text-[9px] text-muted leading-tight">{sign.dates}</p>
            </div>
          </div>

          <div className="flex gap-0.5 mb-2">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                size={10}
                className={
                  i < sign.rating ? "fill-gold text-gold" : "text-gold/20"
                }
              />
            ))}
          </div>

          <p className="text-xs text-muted leading-relaxed line-clamp-3">
            {sign.text}
          </p>
        </Card>
      ))}
    </div>
  );
}
