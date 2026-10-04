"use client";

import { useTranslation } from "react-i18next";
import { Check, Minus } from "lucide-react";
import type { PassFeature, PassTierBenefits } from "@/lib/pass-api";

/** Every Pass-only feature, in the order the tiers add them. Find My Date shares a line with Decisions. */
const FEATURE_LINES: Array<{ feature: PassFeature; key: string }> = [
  { feature: "timeline", key: "pass.benefits.timeline" },
  { feature: "bonds", key: "pass.benefits.bonds" },
  { feature: "decisions", key: "pass.benefits.decisions" },
  { feature: "birthTime", key: "pass.benefits.birthTime" },
  { feature: "relocation", key: "pass.benefits.relocation" },
];

/**
 * What one Aroha Pass tier includes — on /pass and on every Pass lock. With
 * `showMissing`, the features the tier leaves out are listed too, greyed out,
 * so the three tiers can be compared line by line.
 */
export default function PassBenefits({
  benefits,
  showMissing = false,
}: {
  benefits: PassTierBenefits;
  showMissing?: boolean;
}) {
  const { t } = useTranslation();
  const lines = [
    { text: t("pass.benefits.questions", { count: benefits.questionsPerPeriod }), included: true },
    { text: t("pass.benefits.reports", { pct: benefits.reportDiscountPct }), included: true },
    ...FEATURE_LINES.map(({ feature, key }) => ({ text: t(key), included: benefits.features.includes(feature) })),
  ].filter((line) => line.included || showMissing);

  return (
    <ul className="space-y-1.5 text-left text-sm text-foreground/90">
      {lines.map((line) => (
        <li key={line.text} className={`flex gap-2 ${line.included ? "" : "text-muted opacity-60"}`}>
          {line.included ? (
            <Check size={14} className="mt-0.5 shrink-0 text-emerald-400" />
          ) : (
            <Minus size={14} className="mt-0.5 shrink-0" />
          )}
          <span>
            {!line.included && <span className="sr-only">{t("pass.notIncluded")}: </span>}
            {line.text}
          </span>
        </li>
      ))}
    </ul>
  );
}
