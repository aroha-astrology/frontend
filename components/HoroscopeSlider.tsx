"use client";

import { useMemo, useState } from "react";
import { Star } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import Card from "@/components/ui/Card";
import ForecastDetailModal from "@/components/horoscope/ForecastDetailModal";
import { useMoonSignForecasts } from "@/hooks/useMoonSignForecasts";
import { useKundli } from "@/hooks/useKundli";
import { getUserMoonSign } from "@/lib/kundli-helpers";

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
  const { t } = useTranslation();
  const { forecasts, loading } = useMoonSignForecasts();
  const { kundli } = useKundli();
  const [selected, setSelected] = useState<number | null>(null);

  const userMoonSign = getUserMoonSign(kundli);

  // Lead with the user's own moon sign when we know it, so "your" horoscope
  // is the first thing seen rather than always starting at Aries.
  const orderedForecasts = useMemo(() => {
    if (!userMoonSign) return forecasts;
    const idx = forecasts.findIndex((f) => f.name.toLowerCase() === userMoonSign.toLowerCase());
    if (idx <= 0) return forecasts;
    return [forecasts[idx]!, ...forecasts.slice(0, idx), ...forecasts.slice(idx + 1)];
  }, [forecasts, userMoonSign]);

  const selectedForecast = selected !== null ? orderedForecasts[selected] : null;

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
    <>
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide pr-5">
        {orderedForecasts.map((sign, index) => {
          const isUserSign = !!userMoonSign && sign.name.toLowerCase() === userMoonSign.toLowerCase();
          return (
          <Card
            key={sign.name}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`min-w-[160px] max-w-[160px] p-4 flex-shrink-0 cursor-pointer active:scale-95 transition-transform ${
              isUserSign ? "border-gold/50" : "border-gold/10 hover:border-gold/30"
            }`}
            onClick={() => setSelected(index)}
          >
            {isUserSign && (
              <span className="inline-block text-[9px] font-semibold text-gold uppercase tracking-wider mb-1.5">
                {t("home.yourSign")}
              </span>
            )}
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
                <Star key={i} size={10} className={i < sign.rating ? "fill-gold text-gold" : "text-gold/20"} />
              ))}
            </div>

            <p className="text-xs text-muted leading-relaxed line-clamp-3">{sign.text}</p>
          </Card>
          );
        })}
      </div>

      <AnimatePresence>
        {selectedForecast?.raw && (
          <ForecastDetailModal
            forecast={selectedForecast.raw}
            sign={{ name: selectedForecast.name, symbol: selectedForecast.symbol, dates: selectedForecast.dates }}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
