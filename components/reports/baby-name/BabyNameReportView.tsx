"use client";

import { useTranslation } from "react-i18next";
import Card from "@/components/ui/Card";
import { isDoshaYogaSummary, isReportHeader, isReportVerdict } from "@/lib/report-score-facts";
import ReportHeaderCard from "../ReportHeaderCard";
import ReportVerdictCard from "../ReportVerdictCard";
import AnalysisAccordion from "../AnalysisAccordion";
import StrengthsCautions from "../StrengthsCautions";
import PlanetIcon from "../PlanetIcon";
import type { ReportReady } from "@/hooks/useReport";

/** baby_name has only 2 sections. */
const SECTION_ICON: Record<string, string> = {
  suggested_names: "Sparkles",
  naming_themes_blessings: "Home",
};

function readString(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v : null;
}

/**
 * The bespoke Baby Name screen.
 *
 * The whole report turns on one fact — the syllable the baby's Moon nakshatra and pada point
 * to — so that syllable is the hero, shown at display size rather than as a labelled row. The
 * candidate names beneath it are REAL given names from the backend's own corpus, never
 * LLM-invented, which is why they render as plain chips with no hedging.
 *
 * The nakshatra, its lord and its presiding deity render in the backend's English. Nakshatra
 * and deity names are proper nouns with no translation table in this app (the same known gap
 * ReportHeaderCard notes); the LORD is a planet, so it goes through the shared planetNames
 * table like everywhere else.
 *
 * `doshaYoga` here describes the BABY's own chart, not the purchasing parent's, and the
 * backend deliberately frames it gently for a new parent — so it renders as-is, under a
 * heading that says whose chart it is.
 *
 * No gemstones — extends ReportSharedFacts, not the WithGemstones variant.
 */
export default function BabyNameReportView({ data }: { data: ReportReady }) {
  const { t } = useTranslation();
  const scores = data.scores;
  const verdict = isReportVerdict(scores.verdict) ? scores.verdict : null;

  const syllable = Array.isArray(scores.startingSyllables)
    ? readString(scores.startingSyllables[0])
    : null;
  const nakshatra = readString(scores.moonNakshatra);
  const pada = typeof scores.moonPada === "number" ? scores.moonPada : null;
  const lord = readString(scores.nakshatraLord);
  const deity = readString(scores.nakshatraDeity);
  const candidates = Array.isArray(scores.candidateNames)
    ? scores.candidateNames.filter((n): n is string => typeof n === "string" && n.trim() !== "")
    : [];

  return (
    <>
      {isReportHeader(scores.header) && <ReportHeaderCard header={scores.header} />}

      <Card className="p-4">
        <h2 className="font-display text-sm text-foreground">{t("babyNameReport.syllable.title")}</h2>
        {syllable ? (
          <p className="font-display text-5xl text-gold leading-none mt-3 mb-1">{syllable}</p>
        ) : (
          <p className="text-[11px] text-muted mt-2">{t("babyNameReport.syllable.unavailable")}</p>
        )}
        {nakshatra && (
          <p className="text-[11px] text-muted mt-1.5">
            {pada !== null
              ? t("babyNameReport.syllable.fromPada", { nakshatra, pada })
              : t("babyNameReport.syllable.from", { nakshatra })}
          </p>
        )}
        {verdict?.headline && (
          <p className="text-[11px] leading-snug text-muted mt-2">{verdict.headline}</p>
        )}

        {(lord || deity) && (
          <div className="mt-3.5 pt-3 border-t border-gold/10 flex flex-col gap-2">
            {lord && (
              <div className="flex items-center gap-2">
                <PlanetIcon planet={lord.toLowerCase()} size={24} />
                <span className="text-[11px] text-muted flex-1">{t("babyNameReport.lord")}</span>
                <span className="text-xs text-foreground capitalize">
                  {t(`planetNames.${lord.toLowerCase()}`, { defaultValue: lord })}
                </span>
              </div>
            )}
            {deity && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted flex-1">{t("babyNameReport.deity")}</span>
                <span className="text-xs text-foreground">{deity}</span>
              </div>
            )}
          </div>
        )}
      </Card>

      {candidates.length > 0 && (
        <section>
          <h2 className="font-display text-base text-gold mb-2">
            {t("babyNameReport.candidates.title")}
          </h2>
          <Card className="p-3.5">
            <div className="flex flex-wrap gap-2">
              {candidates.map((name) => (
                <span
                  key={name}
                  className="rounded-full border border-gold/25 bg-gold/[0.06] px-3 py-1.5 text-xs text-foreground/90"
                >
                  {name}
                </span>
              ))}
            </div>
          </Card>
        </section>
      )}

      <AnalysisAccordion
        sections={data.sections}
        sectionIcon={SECTION_ICON}
        titleKey="babyNameReport.analysis.title"
      />

      {isDoshaYogaSummary(scores.doshaYoga) && (
        <section>
          <h2 className="font-display text-base text-gold mb-2">
            {t("babyNameReport.childChart.title")}
          </h2>
          <StrengthsCautions
            summary={scores.doshaYoga}
            strengthsKey="babyNameReport.strengths"
            cautionsKey="babyNameReport.cautions"
          />
        </section>
      )}

      {verdict && <ReportVerdictCard verdict={verdict} />}
    </>
  );
}
