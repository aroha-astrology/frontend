"use client";

import { useTranslation } from "react-i18next";
import { Heart, Users } from "lucide-react";

type LoveOrArrange = "love" | "arrange" | "mixed" | string;

const CONFIG: Record<
  string,
  { icon: React.ReactNode; label: string; description: string; gradient: string; border: string }
> = {
  love: {
    icon: <Heart size={28} className="text-rose-400" />,
    label: "Love Marriage",
    description:
      "Your chart strongly indicates a love marriage. Venus and the 5th house energies point toward a partner you choose through personal connection and mutual attraction.",
    gradient: "from-rose-500/10 to-pink-500/5",
    border: "border-rose-400/25",
  },
  arrange: {
    icon: <Users size={28} className="text-gold" />,
    label: "Arranged Marriage",
    description:
      "Your chart favors an arranged marriage facilitated through family or social channels. The 7th house lord's placement indicates a traditionally introduced alliance.",
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
    label: "Love-cum-Arranged",
    description:
      "Your chart shows a blend of both — you may meet your partner through a common introduction, but the connection develops through personal chemistry before becoming formal.",
    gradient: "from-purple-500/10 to-indigo-500/5",
    border: "border-purple-400/25",
  },
};

export default function LoveOrArrangeCard({ value }: { value: LoveOrArrange }) {
  const { t } = useTranslation();
  const key = value in CONFIG ? value : "mixed";
  const cfg = CONFIG[key]!;

  return (
    <section>
      <h2 className="font-display text-base text-gold mb-2">
        {t("marriageReport.loveOrArrange.title", "Love or Arranged Marriage?")}
      </h2>
      <div
        className={`rounded-2xl border p-4 bg-gradient-to-br ${cfg.gradient} ${cfg.border}`}
      >
        <div className="flex items-center gap-3 mb-3">
          {cfg.icon}
          <span className="font-display text-lg font-bold text-foreground">
            {t(`marriageReport.loveOrArrange.${key}`, cfg.label)}
          </span>
        </div>
        <p className="text-sm text-foreground/80 leading-relaxed">
          {t(`marriageReport.loveOrArrange.${key}Desc`, cfg.description)}
        </p>
      </div>
    </section>
  );
}
