"use client";

import { X } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { MonthlyBreakdownEntry } from "@/lib/api";

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
          <h2 className="text-lg font-semibold font-display text-foreground">
            {t("horoscope.monthByMonthTitle", { year })}
          </h2>
          <button
            onClick={onClose}
            aria-label={t("tour.skip")}
            className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-muted hover:text-foreground transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 pt-4 pb-6">
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
        </div>
      </motion.div>
    </motion.div>
  );
}
