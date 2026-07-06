"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Star, X, Moon, Sparkles, Palette, Hash, ArrowRight, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { isDaily, type ForecastData, PLANET_EMOJI, QUALITY_BADGE_KEYS } from "./types";

type ViewMode = "plain" | "technical";

export default function ForecastDetailModal({
  forecast,
  sign,
  onClose,
}: {
  forecast: ForecastData;
  sign: { name: string; symbol: string; dates: string };
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [view, setView] = useState<ViewMode>("plain");
  const badgeKey = QUALITY_BADGE_KEYS[forecast.quality] ?? QUALITY_BADGE_KEYS.moderate;
  const daily = isDaily(forecast);

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 25 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-[85vh] overflow-y-auto bg-card border border-gold/20 rounded-t-3xl sm:rounded-2xl shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 bg-card/95 backdrop-blur-xl border-b border-gold/10 px-5 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-full border-2 border-gold/40 flex items-center justify-center text-2xl shrink-0">
              {sign.symbol}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold font-display text-foreground">{sign.name}</h2>
              <p className="text-xs text-muted truncate">
                {daily ? forecast.date : `${forecast.periodStart} – ${forecast.periodEnd}`} &middot; {sign.dates}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-muted hover:text-foreground transition-colors shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Technical / Plain toggle — same underlying data, two renderers */}
        <div className="px-5 pt-4">
          <div className="flex rounded-xl border border-gold/15 p-1 bg-surface/40">
            {(["plain", "technical"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setView(mode)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  view === mode ? "bg-gold text-[#1a0e00]" : "text-muted"
                }`}
              >
                {t(`horoscope.toggle.${mode}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Score + Quality — shown in both views */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={18} className={i < forecast.score ? "fill-gold text-gold" : "text-gold/20"} />
              ))}
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${badgeKey.bg} ${badgeKey.text}`}>
              {t(badgeKey.i18nKey)}
            </span>
          </div>

          {view === "plain" ? (
            <>
              {/* Hook — the one-line lead, spec 4.1 */}
              <p className="text-base text-gold font-semibold leading-snug">{forecast.hook}</p>

              {/* Supporting explanation */}
              <p className="text-sm text-foreground/90 leading-relaxed">{forecast.description}</p>

              {/* Advice */}
              <div className="bg-gold/5 border border-gold/15 rounded-xl p-4">
                <div className="flex items-center gap-2 text-gold text-xs font-medium uppercase tracking-wider mb-2">
                  <Sparkles size={14} />
                  {t("horoscope.detail.todaysAdvice")}
                </div>
                <p className="text-sm text-foreground/90 leading-relaxed">{forecast.advice}</p>
              </div>

              {/* Lucky Elements — light, low-stakes addition per spec 1.3 */}
              <div className="flex gap-3">
                <div className="flex-1 bg-surface/50 border border-gold/10 rounded-xl p-3 text-center">
                  <Palette size={16} className="text-gold mx-auto mb-1" />
                  <p className="text-xs text-muted">{t("horoscope.detail.luckyColor")}</p>
                  <p className="text-sm text-foreground font-medium">{forecast.luckyColor}</p>
                </div>
                <div className="flex-1 bg-surface/50 border border-gold/10 rounded-xl p-3 text-center">
                  <Hash size={16} className="text-gold mx-auto mb-1" />
                  <p className="text-xs text-muted">{t("horoscope.detail.luckyNumber")}</p>
                  <p className="text-sm text-foreground font-medium">{forecast.luckyNumber}</p>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Technical facts — traceable to the calculation, never invented */}
              {daily ? (
                <div className="bg-surface/50 border border-gold/10 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-gold text-xs font-medium uppercase tracking-wider">
                    <Moon size={14} />
                    {t("horoscope.detail.moonTransit")}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted text-xs">{t("horoscope.detail.transitSign")}</p>
                      <p className="text-foreground font-medium">{forecast.transitMoonSign}</p>
                    </div>
                    <div>
                      <p className="text-muted text-xs">{t("horoscope.detail.nakshatra")}</p>
                      <p className="text-foreground font-medium">{forecast.transitMoonNakshatra ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted text-xs">{t("horoscope.detail.houseFromSign")}</p>
                      <p className="text-foreground font-medium">{t("horoscope.detail.nthHouse", { n: forecast.houseFromSign })}</p>
                    </div>
                    <div>
                      <p className="text-muted text-xs">{t("horoscope.detail.ashtamaChandra")}</p>
                      <p className={`font-medium ${forecast.isAshtamaChandra ? "text-red-400" : "text-emerald-400"}`}>
                        {forecast.isAshtamaChandra ? `${t("common.yes")} ⚠️` : `${t("common.no")} ✓`}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-surface/50 border border-gold/10 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-gold text-xs font-medium uppercase tracking-wider">
                    <Calendar size={14} />
                    {t("horoscope.detail.periodSample")}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted text-xs">{t("horoscope.detail.favorableDays")}</p>
                      <p className="text-foreground font-medium">{forecast.favorableDays} / {forecast.totalDaysSampled}</p>
                    </div>
                    {forecast.bestDay && (
                      <div>
                        <p className="text-muted text-xs">{t("horoscope.detail.bestDay")}</p>
                        <p className="text-emerald-400 font-medium">{forecast.bestDay.date} ({forecast.bestDay.score}/5)</p>
                      </div>
                    )}
                    {forecast.worstDay && (
                      <div>
                        <p className="text-muted text-xs">{t("horoscope.detail.worstDay")}</p>
                        <p className="text-amber-400 font-medium">{forecast.worstDay.date} ({forecast.worstDay.score}/5)</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Key Transits */}
              {forecast.keyTransits?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-gold text-xs font-medium uppercase tracking-wider mb-3">
                    <ArrowRight size={14} />
                    {t("horoscope.detail.keyTransits")}
                  </div>
                  <div className="space-y-2">
                    {forecast.keyTransits.map((transit) => (
                      <div key={transit.planet} className="flex items-center gap-3 bg-surface/30 border border-gold/5 rounded-lg px-3 py-2.5">
                        <span className="text-lg">{PLANET_EMOJI[transit.planet] ?? "🪐"}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground font-medium">
                            {t("horoscope.detail.planetInSign", { planet: transit.planet, sign: transit.sign })}
                            <span className="text-muted font-normal"> · {t("horoscope.detail.nthHouse", { n: transit.house })}</span>
                          </p>
                          <p className="text-xs text-muted truncate">{transit.influence}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom padding for mobile — clears the fixed bottom nav bar (h-20) */}
        <div className="h-24" />
      </motion.div>
    </motion.div>,
    document.body,
  );
}
