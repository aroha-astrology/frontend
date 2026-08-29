"use client";

import { Hash, Palette, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { PersonalizedHoroscope } from "@/lib/api";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import CategoryRatingRow from "./CategoryRatingRow";
import DashaChapterCard from "./DashaChapterCard";
import HoroscopeRemedyCard from "./HoroscopeRemedyCard";

const CATEGORY_ORDER = ["overall", "health", "career", "marriage", "finance", "education"] as const;

/**
 * Full 4-category breakdown for the personalized card, opened on tap (spec
 * 2026-07-03). Note: `data.structured` (and therefore this modal) is only
 * ever populated for daily/weekly/monthly — yearly has no per-category score
 * and keeps its existing summary + "view month by month" entry point directly
 * on the card (see PersonalizedCard in app/horoscope/page.tsx), so those two
 * flows never overlap.
 */
export default function PersonalizedDetailModal({
  data,
  onClose,
}: {
  data: PersonalizedHoroscope;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const s = data.structured;

  return (
    <BottomSheetModal
      onClose={onClose}
      closeLabel={t("tour.skip")}
      header={
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles size={18} className="text-gold shrink-0" />
          <h2 className="text-lg font-semibold font-display text-foreground truncate">
            {t("horoscope.personalizedTitle")}
          </h2>
        </div>
      }
    >
      {s ? (
        <div className="space-y-2.5">
          {CATEGORY_ORDER.map((category) => (
            <CategoryRatingRow key={category} category={category} reading={s.categories[category]} />
          ))}

          <div className="flex gap-3 pt-1">
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

          {s.remedy && <HoroscopeRemedyCard remedy={s.remedy} />}

          {data.dasha && (
            <div className="pt-1">
              <DashaChapterCard dasha={data.dasha} />
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-foreground/90 leading-relaxed">{data.summary}</p>
      )}

      <p className="text-[10px] text-muted text-center mt-4">{data.forDate}</p>
    </BottomSheetModal>
  );
}
