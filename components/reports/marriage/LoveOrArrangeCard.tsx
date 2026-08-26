"use client";

import { useTranslation } from "react-i18next";
import { Heart, Users } from "lucide-react";

/** The three bands marriage.ts's `loveOrArrange` can produce (see computeLoveVsArrangedTilt). */
export type LoveOrArrange = "love" | "arrange" | "mixed";

/**
 * Per-band presentation only — icon and colors. Label and description come from i18n
 * (marriageReport.loveOrArrange.*), never from this table: Tailwind class strings must live in
 * a component file for the JIT to see them, but user-facing text must not.
 */
const CONFIG: Record<LoveOrArrange, { icon: React.ReactNode; gradient: string; border: string }> = {
  love: {
    icon: <Heart size={28} className="text-rose-400" />,
    gradient: "from-rose-500/10 to-pink-500/5",
    border: "border-rose-400/25",
  },
  arrange: {
    icon: <Users size={28} className="text-gold" />,
    gradient: "from-yellow-500/10 to-amber-500/5",
    border: "border-gold/25",
  },
  mixed: {
    icon: (
      <span className="flex gap-1">
        <Heart size={20} className="text-rose-400" />
        <Users size={20} className="text-gold" />
      </span>
    ),
    gradient: "from-purple-500/10 to-indigo-500/5",
    border: "border-purple-400/25",
  },
};

export function isLoveOrArrange(v: unknown): v is LoveOrArrange {
  return v === "love" || v === "arrange" || v === "mixed";
}

export default function LoveOrArrangeCard({ value }: { value: LoveOrArrange }) {
  const { t } = useTranslation();
  const cfg = CONFIG[value];

  return (
    <section>
      <h2 className="font-display text-base text-gold mb-2">
        {t("marriageReport.loveOrArrange.title")}
      </h2>
      <div className={`rounded-2xl border p-4 bg-gradient-to-br ${cfg.gradient} ${cfg.border}`}>
        <div className="flex items-center gap-3 mb-3">
          {cfg.icon}
          <span className="font-display text-lg font-bold text-foreground">
            {t(`marriageReport.loveOrArrange.${value}.label`)}
          </span>
        </div>
        <p className="text-sm text-foreground/80 leading-relaxed">
          {t(`marriageReport.loveOrArrange.${value}.description`)}
        </p>
      </div>
    </section>
  );
}
