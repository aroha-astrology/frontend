"use client";

import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import type { PassStatus } from "@/lib/pass-api";

/** What the Aroha Pass includes — on /pass and on every Pass lock. */
export default function PassBenefits({ benefits }: { benefits: PassStatus["benefits"] }) {
  const { t } = useTranslation();
  return (
    <ul className="space-y-1.5 text-left text-sm text-foreground/90">
      {[
        t("pass.benefits.questions", { count: benefits.questionsPerPeriod }),
        t("pass.benefits.timeline"),
        t("pass.benefits.bonds"),
        t("pass.benefits.decisions"),
        t("pass.benefits.birthTime"),
        t("pass.benefits.relocation"),
        t("pass.benefits.reports", { pct: benefits.reportDiscountPct }),
      ].map((line) => (
        <li key={line} className="flex gap-2">
          <Check size={14} className="mt-0.5 shrink-0 text-emerald-400" />
          {line}
        </li>
      ))}
    </ul>
  );
}
