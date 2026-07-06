"use client";

import { useTranslation } from "react-i18next";
import type { MonthlyBreakdownEntry } from "@/lib/api";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import { CATEGORY_ICON } from "@/components/horoscope/CategoryRatingRow";
import type { SubCategory } from "@/components/horoscope/types";

const SUB_CATEGORY_ORDER: SubCategory[] = ["health", "career", "marriage", "finance", "education"];

export default function MonthlyBreakdownModal({
  year,
  overview,
  months,
  onClose,
}: {
  year: string;
  overview: string;
  months: MonthlyBreakdownEntry[];
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <BottomSheetModal
      onClose={onClose}
      closeLabel={t("tour.skip")}
      header={
        <h2 className="text-lg font-semibold font-display text-foreground truncate">
          {t("horoscope.monthByMonthTitle", { year })}
        </h2>
      }
    >
      <p className="text-sm text-foreground/90 leading-relaxed mb-5">{overview}</p>

      <div className="space-y-3">
        {months.map((m) => (
          <div key={m.month} className="p-3.5 rounded-xl border border-gold/10 bg-surface">
            <p className="text-[11px] font-semibold text-gold uppercase tracking-wider mb-1">
              {m.monthLabel}
            </p>
            <p className="text-sm text-foreground/90 leading-relaxed">{m.summary}</p>

            {m.categoryHooks && (
              <div className="mt-3 pt-3 border-t border-gold/10 space-y-1.5">
                {SUB_CATEGORY_ORDER.map((category) => (
                  <div key={category} className="flex items-start gap-2">
                    <span className="text-gold shrink-0 mt-0.5">{CATEGORY_ICON[category]}</span>
                    <p className="text-xs text-foreground/85 leading-relaxed">
                      <span className="font-medium text-foreground">
                        {t(`horoscope.category.${category}`)}:
                      </span>{" "}
                      {m.categoryHooks![category]}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </BottomSheetModal>
  );
}
