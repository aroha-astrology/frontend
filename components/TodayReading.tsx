"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { ChevronRight, Sparkles, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import Card from "@/components/ui/Card";
import { usePersonalizedHoroscope } from "@/hooks/usePersonalizedHoroscope";
import PersonalizedDetailModal from "@/components/horoscope/PersonalizedDetailModal";
import { QUALITY_BADGE_KEYS } from "@/components/horoscope/types";
import CategoryHookRotator from "@/components/home/CategoryHookRotator";

/**
 * Home page's "Today's Reading" card — a brief Overall highlight from today's
 * personalized horoscope, with a Details button that opens the SAME
 * PersonalizedDetailModal the /horoscope page uses (full Health/Career/
 * Marriage/Finance/Education breakdown) — one modal, so this card and the
 * horoscope page's daily view are never out of sync with each other.
 * Replaces the old static AI Astrologer promo card; the bottom nav's central
 * "Ask AI" button remains the entry point to chat.
 */
export default function TodayReading() {
  const { t } = useTranslation();
  const { state, data } = usePersonalizedHoroscope("daily");
  const [showDetails, setShowDetails] = useState(false);

  if (state === "loading" || state === "generating") {
    return (
      <Card className="p-5 border-gold/10 animate-pulse">
        <div className="h-4 w-32 rounded bg-gold/10 mb-3" />
        <div className="h-3 w-full rounded bg-gold/5 mb-1.5" />
        <div className="h-3 w-2/3 rounded bg-gold/5" />
      </Card>
    );
  }

  if (state === "empty") {
    return (
      <Card className="p-5 border-gold/10 text-center">
        <p className="text-sm text-muted">{t("horoscope.personalizedEmpty")}</p>
      </Card>
    );
  }

  // Guarded the same way as the /horoscope page's PersonalizedCard — a
  // truthy `structured` with no `categories.overall` (a still-inconsistent
  // stale row) must not render/crash here either.
  if (state !== "ready" || !data?.structured?.categories?.overall) return null;

  const overall = data.structured.categories.overall;
  const badgeKey = QUALITY_BADGE_KEYS[overall.quality] ?? QUALITY_BADGE_KEYS.moderate;

  return (
    <>
      <Card
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 border-gold/20 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-gold/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 text-gold text-xs font-medium uppercase tracking-wider">
            <Sparkles size={14} />
            {t("home.todayReadingTitle")}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={12} className={i < overall.score ? "fill-gold text-gold" : "text-gold/20"} />
              ))}
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${badgeKey.bg} ${badgeKey.text}`}>
              {t(badgeKey.i18nKey)}
            </span>
          </div>
        </div>

        <p className="text-base text-gold font-semibold leading-snug mb-1.5">{overall.hook}</p>
        <p className="text-sm text-foreground/90 leading-relaxed">{overall.advice}</p>

        <CategoryHookRotator categories={data.structured.categories} />

        <div className="flex justify-end mt-3">
          <button
            onClick={() => setShowDetails(true)}
            className="flex items-center gap-0.5 text-[11px] font-medium text-gold hover:text-gold-light transition-colors"
          >
            {t("home.todayReadingDetails")}
            <ChevronRight size={12} />
          </button>
        </div>
      </Card>

      <AnimatePresence>
        {showDetails && <PersonalizedDetailModal data={data} onClose={() => setShowDetails(false)} />}
      </AnimatePresence>
    </>
  );
}
