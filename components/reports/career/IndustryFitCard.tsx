"use client";

import { useTranslation } from "react-i18next";
import Card from "@/components/ui/Card";
import { industrySlug } from "@/lib/monthly-report-view";

/**
 * The industries this chart's 10th-house lord classically favours.
 *
 * The backend emits these as plain English strings from a fixed catalogue
 * (career-monthly.ts's INDUSTRY_FIT_BY_PLANET), so each is looked up by slug with the raw
 * string as `defaultValue` — an industry added server-side later still renders, just untranslated,
 * rather than showing a missing-key. Same graceful degradation GunaKootaBreakdown applies to
 * koota names it does not recognise.
 *
 * `note` is deliberately NOT rendered: it is backend-generated English prose (and for Rahu/Ketu
 * it carries a "this pairing is unconventional" caveat), which the translated
 * `industries_that_fit` narrative section already conveys in the reader's own language.
 */
export default function IndustryFitCard({ industries }: { industries: string[] }) {
  const { t } = useTranslation();
  if (industries.length === 0) return null;

  return (
    <section>
      <h2 className="font-display text-base text-gold mb-2">{t("careerReport.industries.title")}</h2>
      <Card className="p-3.5">
        <div className="flex flex-wrap gap-2">
          {industries.map((industry) => (
            <span
              key={industry}
              className="rounded-full border border-gold/25 bg-gold/[0.06] px-3 py-1.5 text-[11px] text-foreground/90"
            >
              {t(`careerReport.industry.${industrySlug(industry)}`, { defaultValue: industry })}
            </span>
          ))}
        </div>
      </Card>
    </section>
  );
}
