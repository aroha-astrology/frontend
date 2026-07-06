"use client";

import { useTranslation } from "react-i18next";
import type { MonthlyBreakdownEntry } from "@/lib/api";
import BottomSheetModal from "@/components/ui/BottomSheetModal";

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
          </div>
        ))}
      </div>
    </BottomSheetModal>
  );
}
