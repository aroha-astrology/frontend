"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ChevronRight, Hash, Palette, Sparkles, Star } from "lucide-react";
import { api, ApiError, type PersonalizedHoroscope } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { useMoonSignForecasts } from "@/hooks/useMoonSignForecasts";
import ForecastDetailModal from "@/components/horoscope/ForecastDetailModal";
import MonthlyBreakdownModal from "@/components/horoscope/MonthlyBreakdownModal";
import DashaChapterCard from "@/components/horoscope/DashaChapterCard";
import Card from "@/components/ui/Card";
import type { Timescale } from "@/components/horoscope/types";
import { QUALITY_BADGE_KEYS } from "@/components/horoscope/types";

function PersonalizedCard({ period }: { period: Timescale }) {
  const { t } = useTranslation();
  const { firebaseUser, loading: authLoading } = useAuth();
  const [state, setState] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [data, setData] = useState<PersonalizedHoroscope | null>(null);
  const [showMonths, setShowMonths] = useState(false);

  useEffect(() => {
    if (authLoading || !firebaseUser) return;
    let cancelled = false;
    setState("loading");
    setShowMonths(false);

    api
      .horoscope(period)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setState("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) setState("empty");
        else setState("error");
      });

    return () => { cancelled = true; };
  }, [authLoading, firebaseUser, period]);

  if (state === "loading") {
    return (
      <Card className="p-5 border-gold/10 animate-pulse">
        <div className="h-4 w-40 rounded bg-gold/10 mb-3" />
        <div className="h-3 w-full rounded bg-gold/5 mb-1.5" />
        <div className="h-3 w-3/4 rounded bg-gold/5" />
      </Card>
    );
  }

  if (state === "empty") {
    return (
      <Card className="p-5 border-gold/10 text-center text-sm text-muted">
        {t("horoscope.personalizedEmpty")}
      </Card>
    );
  }

  if (state === "error" || !data) return null;

  const hasMonths = period === "yearly" && !!data.monthlyBreakdown?.length;
  const year = data.forDate.slice(0, 4);
  const s = data.structured;
  const badgeKey = s ? (QUALITY_BADGE_KEYS[s.quality] ?? QUALITY_BADGE_KEYS.moderate) : null;

  return (
    <>
      <Card initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5 border-gold/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-gold/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-2 text-gold text-xs font-medium uppercase tracking-wider mb-3">
          <Sparkles size={14} />
          {t("horoscope.personalizedTitle")}
        </div>

        {s && badgeKey ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} className={i < s.score ? "fill-gold text-gold" : "text-gold/20"} />
                ))}
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${badgeKey.bg} ${badgeKey.text}`}>
                {t(badgeKey.i18nKey)}
              </span>
            </div>

            <p className="text-base text-gold font-semibold leading-snug">{s.hook}</p>
            <p className="text-sm text-foreground/90 leading-relaxed">{s.description}</p>

            <div className="bg-gold/5 border border-gold/15 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gold text-xs font-medium uppercase tracking-wider mb-2">
                <Sparkles size={14} />
                {t("horoscope.detail.todaysAdvice")}
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed">{s.advice}</p>
            </div>

            <div className="flex gap-3">
              <div className="flex-1 bg-surface/50 border border-gold/10 rounded-xl p-3 text-center">
                <Palette size={16} className="text-gold mx-auto mb-1" />
                <p className="text-xs text-muted">{t("horoscope.detail.luckyColor")}</p>
                <p className="text-sm text-foreground font-medium">{s.luckyColor}</p>
              </div>
              <div className="flex-1 bg-surface/50 border border-gold/10 rounded-xl p-3 text-center">
                <Hash size={16} className="text-gold mx-auto mb-1" />
                <p className="text-xs text-muted">{t("horoscope.detail.luckyNumber")}</p>
                <p className="text-sm text-foreground font-medium">{s.luckyNumber}</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground/90 leading-relaxed">{data.summary}</p>
        )}

        {data.dasha && (
          <div className="mt-4">
            <DashaChapterCard dasha={data.dasha} />
          </div>
        )}

        <div className="flex items-center justify-between mt-3">
          <p className="text-[10px] text-muted">{data.forDate}</p>
          {hasMonths && (
            <button
              onClick={() => setShowMonths(true)}
              className="flex items-center gap-0.5 text-[11px] font-medium text-gold hover:text-gold-light transition-colors"
            >
              {t("horoscope.viewMonthByMonth")}
              <ChevronRight size={12} />
            </button>
          )}
        </div>
      </Card>

      <AnimatePresence>
        {showMonths && hasMonths && (
          <MonthlyBreakdownModal
            year={year}
            overview={data.summary}
            months={data.monthlyBreakdown!}
            onClose={() => setShowMonths(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

const TIMESCALES: Timescale[] = ["daily", "weekly", "monthly", "yearly"];

export default function HoroscopePage() {
  const { t } = useTranslation();
  const [timescale, setTimescale] = useState<Timescale>("daily");
  const { forecasts, loading } = useMoonSignForecasts(timescale);
  const [selected, setSelected] = useState<number | null>(null);

  const selectedForecast = selected !== null ? forecasts[selected] : null;

  return (
    <main className="min-h-screen pb-28" style={{ background: "var(--background)" }}>
      <div className="px-5 pt-10">
        <h1 className="text-3xl font-bold text-center text-gold font-display">{t("horoscope.title")}</h1>

        {/* Timescale tabs */}
        <div className="mt-6 grid grid-cols-4 gap-2 items-stretch">
          {TIMESCALES.map((ts) => (
            <button
              key={ts}
              onClick={() => {
                setTimescale(ts);
                setSelected(null);
              }}
              className={`flex flex-col items-center justify-center gap-0.5 px-1 py-2.5 rounded-xl text-xs font-medium border text-center transition-colors ${
                timescale === ts
                  ? "border-gold/50 bg-gold/10 text-gold"
                  : "border-gold/10 text-muted hover:border-gold/30"
              }`}
            >
              <span className="leading-tight">{t(`horoscope.tab.${ts}`)}</span>
            </button>
          ))}
        </div>

        {/* Personalized horoscope — grounded in the user's own chart, distinct
            from the generic per-sign moon-sign section below. Available for
            all four timescales; yearly additionally offers a month-by-month
            detail view. */}
        <div className="mt-4">
          <PersonalizedCard period={timescale} />
        </div>

        {/* Moon-sign section */}
        <div className="mt-8">
          <h2 className="text-lg font-display text-foreground mb-1">{t("horoscope.moonSignSection")}</h2>
          <p className="text-xs text-muted mb-4">{t("horoscope.moonSignSectionHint")}</p>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="p-4 border-gold/10 animate-pulse">
                  <div className="h-8 w-8 rounded-full bg-gold/10 mb-2" />
                  <div className="h-3 w-16 rounded bg-gold/10" />
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {forecasts.map((sign, index) => (
                <Card
                  key={sign.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="p-4 border-gold/10 hover:border-gold/30 cursor-pointer active:scale-95 transition-transform"
                  onClick={() => setSelected(index)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-9 h-9 rounded-full border border-gold/40 flex items-center justify-center text-gold text-base">
                      {sign.symbol}
                    </div>
                    <h3 className="text-sm font-semibold text-foreground font-display">{sign.name}</h3>
                  </div>
                  <div className="flex gap-0.5 mb-1.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={9} className={i < sign.rating ? "fill-gold text-gold" : "text-gold/20"} />
                    ))}
                  </div>
                  <p className="text-xs text-muted leading-relaxed line-clamp-2">{sign.text}</p>
                </Card>
              ))}
            </div>
          )}
        </div>
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
    </main>
  );
}
