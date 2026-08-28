"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ChevronRight, Sparkles, Star } from "lucide-react";
import type { PersonalizedHoroscopePeriod } from "@/lib/api";
import { useMoonSignForecasts } from "@/hooks/useMoonSignForecasts";
import { usePersonalizedHoroscope } from "@/hooks/usePersonalizedHoroscope";
import { useFeature } from "@/hooks/useFeature";
import FeatureGuard from "@/components/FeatureGuard";
import PredictionRatingCard from "@/components/ui/PredictionRatingCard";
import ForecastDetailModal from "@/components/horoscope/ForecastDetailModal";
import MonthlyBreakdownModal from "@/components/horoscope/MonthlyBreakdownModal";
import PersonalizedDetailModal from "@/components/horoscope/PersonalizedDetailModal";
import PersonalizedProgress from "@/components/horoscope/PersonalizedProgress";
import Card from "@/components/ui/Card";
import { QUALITY_BADGE_KEYS, type Timescale } from "@/components/horoscope/types";
import { zodiacSignLabel } from "@/data/zodiac";

function PersonalizedCard({ period }: { period: PersonalizedHoroscopePeriod }) {
  const { t } = useTranslation();
  // This page (not a home card) is gated by 'nav.horoscope' — a different
  // flag than TodayReading's 'home.todayReading' on Home. In practice
  // FeatureGuard already redirects away from this route when nav.horoscope
  // is off; this is defense-in-depth so the hook never fires either way.
  const { enabled } = useFeature("nav.horoscope");
  const { state, data } = usePersonalizedHoroscope(period, enabled);
  const [showMonths, setShowMonths] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  // The month-breakdown / full-detail modals only ever apply to the period
  // they were opened for — closing them when the period changes avoids
  // showing last period's content layered under next period's card while the
  // new one loads.
  useEffect(() => {
    setShowMonths(false);
    setShowDetail(false);
  }, [period]);

  if (state === "loading" || state === "generating") {
    return <PersonalizedProgress titleKey="horoscope.personalizedTitle" />;
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
  const year = data.forDate?.slice(0, 4) ?? "";
  // Only populated for daily/weekly/monthly — yearly has no per-category
  // score and keeps its plain summary + month-by-month button below instead
  // (see PersonalizedDetailModal's doc comment). `categories` is guaranteed
  // by the backend (it backfills stale pre-category-ratings rows), but guard
  // defensively anyway — a truthy `structured` with no `categories.overall`
  // must fall back to the plain-summary view below, not throw.
  const s = data.structured?.categories?.overall ? data.structured : undefined;
  const badgeKey = s ? (QUALITY_BADGE_KEYS[s.categories.overall.quality] ?? QUALITY_BADGE_KEYS.moderate) : null;

  return (
    <>
      <Card initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5 border-gold/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-gold/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-2 text-gold text-xs font-medium uppercase tracking-wider mb-3">
          <Sparkles size={14} />
          {t("horoscope.personalizedTitle")}
        </div>

        {s && badgeKey ? (
          <button onClick={() => setShowDetail(true)} className="w-full text-left space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} className={i < s.categories.overall.score ? "fill-gold text-gold" : "text-gold/20"} />
                ))}
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${badgeKey.bg} ${badgeKey.text}`}>
                {t(badgeKey.i18nKey)}
              </span>
            </div>

            <p className="text-base text-gold font-semibold leading-snug">{s.categories.overall.hook}</p>

            <div className="flex items-center gap-1 text-[11px] font-medium text-gold">
              {t("horoscope.viewFullReading")}
              <ChevronRight size={12} />
            </div>
          </button>
        ) : (
          <p className="text-sm text-foreground/90 leading-relaxed">{data.summary}</p>
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
        {showDetail && s && <PersonalizedDetailModal data={data} onClose={() => setShowDetail(false)} />}
      </AnimatePresence>

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

// Tomorrow's personalized reading was hidden because the backend produced
// near-identical output across periods — traced (2026-08-28) to a stack of
// backend bugs, all now fixed: an 800-token ceiling too small for the 6-block
// schema (truncated JSON), a deterministic score mathematically frozen for
// months at a time (see jyotish-backend's daily-synthesis.ts), and a prompt
// fed ~97% permanent natal data with almost nothing day-specific to latch
// onto. `tryReuseYesterdaysTomorrow` (horoscope.service.ts) itself was never
// the bug — reusing yesterday's correctly-generated "tomorrow" reading AS
// today is astrologically correct, it's the same calendar day. Re-enable once
// a quick live check across two real calendar days confirms today's and
// tomorrow's readings actually differ now.
const SHOW_TOMORROW_TOGGLE = false;

export default function HoroscopePage() {
  const { t } = useTranslation();
  const { enabled: navHoroscopeEnabled } = useFeature("nav.horoscope");
  const [timescale, setTimescale] = useState<Timescale>("daily");
  const { forecasts, loading } = useMoonSignForecasts(timescale, navHoroscopeEnabled);
  const [selected, setSelected] = useState<number | null>(null);
  // Decoupled from `timescale`: "Tomorrow" only ever applies to the
  // personalized card below, never to the generic moon-sign section (which
  // has no tomorrow-specific backend support) — so it can't just reuse the
  // shared tab state. Switching the main tab away from "daily" resets this
  // back in sync; switching back to "daily" defaults to "daily", not
  // whatever tomorrow-ness was left over from before.
  const [personalizedPeriod, setPersonalizedPeriod] = useState<PersonalizedHoroscopePeriod>("daily");

  const selectedForecast = selected !== null ? forecasts[selected] : null;

  return (
    <FeatureGuard featureKey="nav.horoscope">
    <main className="min-h-screen pb-tab-safe" style={{ background: "var(--background)" }}>
      <div className="px-5 pt-4">
        <h1 className="text-3xl font-bold text-center text-gold font-display">{t("horoscope.title")}</h1>

        {/* Closes the accuracy loop: asks whether a past dated window actually
            played out. Renders nothing when there is nothing to ask, so it
            costs the page nothing on the common path. Placed here because this
            screen is already about timing. */}
        <div data-tour="horoscope-rating">
          <PredictionRatingCard className="mt-4" />
        </div>

        {/* Timescale tabs */}
        <div className="mt-6 grid grid-cols-4 gap-2 items-stretch" data-tour="horoscope-timescale">
          {TIMESCALES.map((ts) => (
            <button
              key={ts}
              onClick={() => {
                setTimescale(ts);
                setPersonalizedPeriod(ts);
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

        {/* Today/Tomorrow — personalized card only, so it only shows up
            alongside the "Today" tab (the moon-sign grid below has no
            tomorrow-specific data and stays on "daily" either way). */}
        {SHOW_TOMORROW_TOGGLE && timescale === "daily" && (
          <div className="mt-3 flex gap-2">
            {(["daily", "tomorrow"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPersonalizedPeriod(p)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors ${
                  personalizedPeriod === p
                    ? "border-gold/50 bg-gold/10 text-gold"
                    : "border-gold/10 text-muted hover:border-gold/30"
                }`}
              >
                {t(`horoscope.tab.${p}`)}
              </button>
            ))}
          </div>
        )}

        {/* Personalized horoscope — grounded in the user's own chart, distinct
            from the generic per-sign moon-sign section below. Available for
            today/tomorrow/weekly/monthly/yearly; yearly additionally offers a
            month-by-month detail view. */}
        <div className="mt-4" data-tour="horoscope-personalized">
          <PersonalizedCard key={personalizedPeriod} period={personalizedPeriod} />
        </div>

        {/* Moon-sign section */}
        <div className="mt-8" data-tour="horoscope-signs">
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
                    <h3 className="text-sm font-semibold text-foreground font-display">{zodiacSignLabel(t, sign.name)}</h3>
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
    </FeatureGuard>
  );
}
