"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { CATEGORY_ICON } from "@/components/horoscope/CategoryRatingRow";
import type { Category, CategoryReading } from "@/components/horoscope/types";

const ROTATE_MS = 2000;
const ORDER: Category[] = ["health", "career", "marriage", "finance", "education"];

/**
 * Cycles through the non-"overall" category hooks on the home page's Daily
 * Insights card. Reuses `hook` text already present on `categories` (same
 * LLM-generated field CategoryRatingRow shows on /horoscope) — no separate
 * fetch or generation here.
 */
export default function CategoryHookRotator({
  categories,
}: {
  categories: Record<Category, CategoryReading>;
}) {
  const { t } = useTranslation();
  const available = ORDER.filter((c) => categories[c]?.hook);
  const [index, setIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const advance = () => {
    setIndex((i) => (i + 1) % available.length);
  };

  const restartTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(advance, ROTATE_MS);
  };

  useEffect(() => {
    if (available.length <= 1) return;
    restartTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available.length]);

  if (available.length === 0) return null;

  const category = available[index % available.length];
  const reading = categories[category];

  return (
    <button
      type="button"
      onClick={() => {
        advance();
        restartTimer();
      }}
      className="w-full text-left mt-3 pt-3 border-t border-gold/10 flex items-center gap-2.5"
    >
      <span className="text-emerald-400 shrink-0">{CATEGORY_ICON[category]}</span>
      <AnimatePresence mode="wait">
        <motion.div
          key={category}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25 }}
          className="flex items-center gap-2 min-w-0"
        >
          <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wide shrink-0">
            {t(`horoscope.category.${category}`)}
          </span>
          <span className="text-[11px] text-muted truncate">"{reading.hook}"</span>
        </motion.div>
      </AnimatePresence>
    </button>
  );
}
