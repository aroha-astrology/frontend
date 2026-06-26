"use client";

import { useEffect, useState } from "react";
import { Star, X, Moon, Sparkles, Palette, Hash, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { zodiac } from "@/data/zodiac";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import Card from "@/components/ui/Card";

interface KeyTransit {
  planet: string;
  sign: string;
  house: number;
  influence: string;
}

interface ForecastData {
  sign: string;
  date: string;
  transitMoonSign: string;
  transitMoonNakshatra?: string;
  houseFromSign: number;
  favorable: boolean;
  isAshtamaChandra: boolean;
  quality: string;
  score: number;
  description: string;
  advice: string;
  luckyColor: string;
  luckyNumber: number;
  keyTransits: KeyTransit[];
}

interface SignForecast {
  name: string;
  dates: string;
  symbol: string;
  rating: number;
  text: string;
  raw: ForecastData | null;
}

function forecastToRating(forecast: unknown): number {
  if (forecast == null) return 3;
  if (typeof forecast === "object" && forecast !== null) {
    const f = forecast as Record<string, unknown>;
    if (typeof f.score === "number") return Math.min(5, Math.max(1, Math.round(f.score)));
    const quality = String(f.quality ?? "").toLowerCase();
    if (quality.includes("good")) return 4;
    if (quality.includes("challenging")) return 2;
    if (quality.includes("avoid")) return 1;
  }
  return 3;
}

function forecastToText(forecast: unknown): string {
  if (forecast == null) return "Cosmic energies align for you today.";
  if (typeof forecast === "object" && forecast !== null) {
    const f = forecast as Record<string, unknown>;
    if (typeof f.description === "string") return f.description;
    if (typeof f.summary === "string") return f.summary;
  }
  return "The stars hold guidance for you today.";
}

const PLANET_EMOJI: Record<string, string> = {
  Sun: "☀️", Moon: "🌙", Mars: "♂️", Mercury: "☿️",
  Jupiter: "♃", Venus: "♀️", Saturn: "♄", Rahu: "🐉", Ketu: "🔥",
};

const QUALITY_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  good: { bg: "bg-emerald-500/20", text: "text-emerald-400", label: "Favorable" },
  challenging: { bg: "bg-amber-500/20", text: "text-amber-400", label: "Challenging" },
  avoid: { bg: "bg-red-500/20", text: "text-red-400", label: "Unfavorable" },
  moderate: { bg: "bg-blue-500/20", text: "text-blue-400", label: "Moderate" },
};

function DetailModal({ forecast, sign, onClose }: { forecast: ForecastData; sign: { name: string; symbol: string; dates: string }; onClose: () => void }) {
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
          {forecast.keyTransits.length > 0 && (
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
  const { firebaseUser, loading: authLoading } = useAuth();
  const [forecasts, setForecasts] = useState<SignForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    if (authLoading || !firebaseUser) return;
    let cancelled = false;

    async function fetchAll() {
      try {
        const results = await Promise.allSettled(
          zodiac.map((sign) => api.moonSignForecast(sign.index)),
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
            text: "Cosmic energies align for you today.",
            raw: null,
          };
        });

        setForecasts(items);
      } catch {
        setForecasts(
          zodiac.map((sign) => ({
            name: sign.name,
            dates: sign.dates,
            symbol: sign.symbol,
            rating: 3,
            text: "Cosmic energies align for you today.",
            raw: null,
          })),
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAll();
    return () => { cancelled = true; };
  }, [authLoading, firebaseUser]);

  const selectedForecast = selected !== null ? forecasts[selected] : null;

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
        {forecasts.map((sign, index) => (
          <Card
            key={sign.name}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="min-w-[160px] max-w-[160px] p-4 border-gold/10 hover:border-gold/30 flex-shrink-0 cursor-pointer active:scale-95 transition-transform"
            onClick={() => setSelected(index)}
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
                <Star key={i} size={10} className={i < sign.rating ? "fill-gold text-gold" : "text-gold/20"} />
              ))}
            </div>

            <p className="text-xs text-muted leading-relaxed line-clamp-3">{sign.text}</p>
          </Card>
        ))}
      </div>

      <AnimatePresence>
        {selectedForecast?.raw && (
          <DetailModal
            forecast={selectedForecast.raw}
            sign={{ name: selectedForecast.name, symbol: selectedForecast.symbol, dates: selectedForecast.dates }}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
