"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { HelpCircle } from "lucide-react";
import { useNewFeature } from "@/hooks/useFeature";
import type { LifeArea } from "@/lib/insights-api";
import WhySheet from "./WhySheet";

/** Maps the horoscope's own category names onto the shared life areas. */
export const HOROSCOPE_CATEGORY_AREA: Record<string, LifeArea> = {
  overall: "overall",
  health: "health",
  career: "career",
  marriage: "relationships",
  finance: "money",
  education: "education",
};

/**
 * A small "Why?" pill that opens the chart evidence for one area. Renders
 * nothing unless `home.whyAroha` is on for this user (ships off).
 */
export default function WhyButton({ area, date, className = "" }: { area: LifeArea; date?: string; className?: string }) {
  const { t } = useTranslation();
  const { enabled } = useNewFeature("home.whyAroha");
  const [open, setOpen] = useState(false);
  if (!enabled) return null;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={`inline-flex items-center gap-1 rounded-full border border-gold/30 px-2 py-0.5 text-[10px] font-medium text-gold hover:bg-gold/10 transition-colors ${className}`}
      >
        <HelpCircle size={11} />
        {t("why.button")}
      </button>
      <AnimatePresence>{open && <WhySheet area={area} date={date} onClose={() => setOpen(false)} />}</AnimatePresence>
    </>
  );
}
