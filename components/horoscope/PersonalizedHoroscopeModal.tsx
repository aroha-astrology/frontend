"use client";

import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { PersonalizedHoroscope } from "@/lib/api";
import PersonalizedHoroscopeDetails from "@/components/horoscope/PersonalizedHoroscopeDetails";

export default function PersonalizedHoroscopeModal({
  data,
  onClose,
}: {
  data: PersonalizedHoroscope;
  onClose: () => void;
}) {
  const { t } = useTranslation();

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
        <div className="sticky top-0 bg-card/95 backdrop-blur-xl border-b border-gold/10 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold font-display text-foreground">{t("home.todayReadingTitle")}</h2>
          <button
            onClick={onClose}
            aria-label={t("common.close")}
            className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-muted hover:text-foreground transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4">
          <PersonalizedHoroscopeDetails data={data} />
          <p className="text-[10px] text-muted mt-3">{data.forDate}</p>
        </div>

        {/* Bottom padding for mobile — clears the fixed bottom nav bar (h-20) */}
        <div className="h-24" />
      </motion.div>
    </motion.div>,
    document.body,
  );
}
