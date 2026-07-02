"use client";

import { Star, X, Moon, Sparkles, Palette, Hash, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { type ForecastData, PLANET_EMOJI, QUALITY_BADGE } from "./types";

export default function ForecastDetailModal({
  forecast,
  sign,
  onClose,
}: {
  forecast: ForecastData;
  sign: { name: string; symbol: string; dates: string };
  onClose: () => void;
}) {
  const badge = QUALITY_BADGE[forecast.quality] ?? QUALITY_BADGE.moderate;

  return (
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
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full border-2 border-gold/40 flex items-center justify-center text-2xl">
              {sign.symbol}
            </div>
            <div>
              <h2 className="text-lg font-semibold font-display text-foreground">{sign.name}</h2>
              <p className="text-xs text-muted">{forecast.date} &middot; {sign.dates}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-muted hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Score + Quality */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={18} className={i < forecast.score ? "fill-gold text-gold" : "text-gold/20"} />
              ))}
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
              {badge.label}
            </span>
          </div>

          {/* Description */}
          <p className="text-sm text-foreground/90 leading-relaxed">{forecast.description}</p>

          {/* Moon Transit */}
          <div className="bg-surface/50 border border-gold/10 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-gold text-xs font-medium uppercase tracking-wider">
              <Moon size={14} />
              Moon Transit
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted text-xs">Transit Sign</p>
                <p className="text-foreground font-medium">{forecast.transitMoonSign}</p>
              </div>
              <div>
                <p className="text-muted text-xs">Nakshatra</p>
                <p className="text-foreground font-medium">{forecast.transitMoonNakshatra ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted text-xs">House from Sign</p>
                <p className="text-foreground font-medium">{forecast.houseFromSign}th House</p>
              </div>
              <div>
                <p className="text-muted text-xs">Ashtama Chandra</p>
                <p className={`font-medium ${forecast.isAshtamaChandra ? "text-red-400" : "text-emerald-400"}`}>
                  {forecast.isAshtamaChandra ? "Yes ⚠️" : "No ✓"}
                </p>
              </div>
            </div>
          </div>

          {/* Lucky Elements */}
          <div className="flex gap-3">
            <div className="flex-1 bg-surface/50 border border-gold/10 rounded-xl p-3 text-center">
              <Palette size={16} className="text-gold mx-auto mb-1" />
              <p className="text-xs text-muted">Lucky Color</p>
              <p className="text-sm text-foreground font-medium">{forecast.luckyColor}</p>
            </div>
            <div className="flex-1 bg-surface/50 border border-gold/10 rounded-xl p-3 text-center">
              <Hash size={16} className="text-gold mx-auto mb-1" />
              <p className="text-xs text-muted">Lucky Number</p>
              <p className="text-sm text-foreground font-medium">{forecast.luckyNumber}</p>
            </div>
          </div>

          {/* Advice */}
          <div className="bg-gold/5 border border-gold/15 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gold text-xs font-medium uppercase tracking-wider mb-2">
              <Sparkles size={14} />
              Today&apos;s Advice
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed">{forecast.advice}</p>
          </div>

          {/* Key Transits */}
          {forecast.keyTransits?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-gold text-xs font-medium uppercase tracking-wider mb-3">
                <ArrowRight size={14} />
                Key Planetary Transits
              </div>
              <div className="space-y-2">
                {forecast.keyTransits.map((t) => (
                  <div key={t.planet} className="flex items-center gap-3 bg-surface/30 border border-gold/5 rounded-lg px-3 py-2.5">
                    <span className="text-lg">{PLANET_EMOJI[t.planet] ?? "🪐"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground font-medium">
                        {t.planet} in {t.sign}
                        <span className="text-muted font-normal"> · {t.house}th House</span>
                      </p>
                      <p className="text-xs text-muted truncate">{t.influence}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom padding for mobile */}
        <div className="h-6" />
      </motion.div>
    </motion.div>
  );
}
