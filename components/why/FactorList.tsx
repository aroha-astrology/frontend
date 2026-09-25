"use client";

import { useTranslation } from "react-i18next";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { WhyFactor } from "@/lib/insights-api";
import { effectKey, whyFactorText } from "@/lib/why-format";

/**
 * A compact list of chart reasons with a helps / holds-back icon each.
 * `extra` adds interpolation values the server leaves to the page (e.g. the
 * other person's display name on an Aroha Bonds reason).
 */
export default function FactorList({ factors, extra }: { factors: WhyFactor[]; extra?: Record<string, string> }) {
  const { t, i18n } = useTranslation();
  return (
    <ul className="space-y-1.5">
      {factors.map((f, i) => {
        const Icon = f.effect > 0 ? TrendingUp : f.effect < 0 ? TrendingDown : Minus;
        const tone = f.effect > 0 ? "text-emerald-400" : f.effect < 0 ? "text-amber-400" : "text-muted";
        const factor = extra ? { ...f, params: { ...f.params, ...extra } } : f;
        return (
          <li key={i} className="flex gap-2 text-xs leading-snug text-foreground/85">
            <Icon size={13} className={`${tone} shrink-0 mt-0.5`} aria-label={t(effectKey(f.effect))} />
            <span>{whyFactorText(t, factor, i18n.language)}</span>
          </li>
        );
      })}
    </ul>
  );
}
