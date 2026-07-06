"use client";

import { Hash, Palette, Sparkles, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { PersonalizedHoroscope } from "@/lib/api";
import DashaChapterCard from "@/components/horoscope/DashaChapterCard";
import { QUALITY_BADGE_KEYS } from "@/components/horoscope/types";

/**
 * The rich "ready" body of a personalized horoscope: score, quality badge,
 * hook/description/advice, lucky color/number, and the dasha chapter card.
 * Shared between the /horoscope page's inline card and the Home page's
 * "Today's Reading" details modal — same data, same rendering, one place.
 */
export default function PersonalizedHoroscopeDetails({ data }: { data: PersonalizedHoroscope }) {
  const { t } = useTranslation();
  const s = data.structured;
  const badgeKey = s ? (QUALITY_BADGE_KEYS[s.quality] ?? QUALITY_BADGE_KEYS.moderate) : null;

  if (!s || !badgeKey) {
    return <p className="text-sm text-foreground/90 leading-relaxed">{data.summary}</p>;
  }

  return (
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

      {data.dasha && (
        <div>
          <DashaChapterCard dasha={data.dasha} />
        </div>
      )}
    </div>
  );
}
