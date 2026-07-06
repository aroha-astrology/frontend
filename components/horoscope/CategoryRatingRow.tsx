"use client";

import { Star, Sparkles, HeartPulse, Briefcase, Heart, Wallet, GraduationCap } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Category, CategoryReading } from "./types";

export const CATEGORY_ICON: Record<Category, React.ReactNode> = {
  overall: <Sparkles size={16} />,
  health: <HeartPulse size={16} />,
  career: <Briefcase size={16} />,
  marriage: <Heart size={16} />,
  finance: <Wallet size={16} />,
  education: <GraduationCap size={16} />,
};

export default function CategoryRatingRow({
  category,
  reading,
}: {
  category: Category;
  reading: CategoryReading;
}) {
  const { t } = useTranslation();

  return (
    <div className="p-3.5 rounded-xl border border-gold/10 bg-surface/50">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 text-foreground text-sm font-semibold">
          <span className="text-gold">{CATEGORY_ICON[category]}</span>
          {t(`horoscope.category.${category}`)}
        </div>
        <div className="flex gap-0.5">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              size={13}
              className={i < reading.score ? "fill-gold text-gold" : "text-gold/20"}
            />
          ))}
        </div>
      </div>
      <p className="text-sm text-gold/90 font-medium leading-snug mb-1">{reading.hook}</p>
      {reading.description && (
        <p className="text-xs text-foreground/80 leading-relaxed mb-1.5">{reading.description}</p>
      )}
      <p className="text-xs text-muted leading-relaxed">{reading.advice}</p>
    </div>
  );
}
