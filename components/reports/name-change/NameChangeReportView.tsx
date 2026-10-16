"use client";

import { useTranslation } from "react-i18next";
import { isNumberArray, isReportHeader, isReportVerdict } from "@/lib/report-score-facts";
import ReportHeaderCard from "../ReportHeaderCard";
import ReportVerdictCard from "../ReportVerdictCard";
import Callout from "../blocks/Callout";
import AnalysisAccordion from "../AnalysisAccordion";
import NameSuggestionCard from "../NameSuggestionCard";
import NumberChips from "../NumberChips";
import CoreNumbersCard, { type CoreNumber } from "../numerology/CoreNumbersCard";
import type { ReportReady } from "@/hooks/useReport";

/** name_change has 5 sections; the two that list names are drawn as cards, not rows. */
const SECTION_ICON: Record<string, string> = {
  numerological_signature: "Sparkles",
  name_change_benefits: "TrendingUp",
  practical_guidance: "Scale",
};

/**
 * The name's signature, in the order the numerology screen shows the same
 * numbers. `pythagorean` is the Expression number under its system's name, so it
 * takes that tile's label; `chaldean` is the number the spelling suggestions
 * are aimed at, and has a tile of its own.
 */
const SIGNATURE: Array<{ field: string; key: string }> = [
  { field: "mulank", key: "mulank" },
  { field: "bhagyank", key: "bhagyank" },
  { field: "chaldean", key: "chaldean" },
  { field: "pythagorean", key: "expression" },
  { field: "soulUrge", key: "soulUrge" },
  { field: "personality", key: "personality" },
];

/**
 * The bespoke Name Change screen.
 *
 * Presentation only, from what the API already returns (backend
 * astro-engine/reports/name-change.ts, NameChangeScores). The reader came for
 * the spellings, so after the name's own numbers the two sections that carry
 * name cards come first and stay open — a suggested spelling behind a chevron
 * would be the one thing they paid for, hidden. The rest of the writing follows
 * as rows.
 *
 * `scores.variants` and `scores.currentName` are not drawn as facts: the
 * variants arrive again, with their reasons, as the cards inside "Suggested
 * Spelling Adjustments", and the current name is what those cards compare
 * against.
 */
export default function NameChangeReportView({ data }: { data: ReportReady }) {
  const { t } = useTranslation();
  const scores = data.scores;
  const verdict = isReportVerdict(scores.verdict) ? scores.verdict : null;

  const alignment =
    typeof scores.alignment === "object" && scores.alignment !== null && !Array.isArray(scores.alignment)
      ? (scores.alignment as Record<string, unknown>)
      : {};
  const signature: CoreNumber[] = SIGNATURE.flatMap(({ field, key }) => {
    const value = alignment[field];
    return typeof value === "number" && Number.isFinite(value) ? [{ key, value }] : [];
  });

  const currentName = typeof scores.currentName === "string" ? scores.currentName : undefined;
  const nameSections = data.sections.filter((s) => s.items && s.items.length > 0);
  const writtenSections = data.sections.filter((s) => !s.items || s.items.length === 0);

  return (
    <>
      {isReportHeader(scores.header) && <ReportHeaderCard header={scores.header} />}

      {verdict?.headline && <Callout eyebrow={t("reports.atAGlance.eyebrow")}>{verdict.headline}</Callout>}

      <CoreNumbersCard numbers={signature} />

      {isNumberArray(alignment.targets) && (
        <section>
          <h2 className="font-display text-base text-gold mb-2">{t("nameChangeReport.targets.title")}</h2>
          <NumberChips values={alignment.targets} />
        </section>
      )}

      {nameSections.map((s, i) => {
        // Spelling variants carry `note` (the exact edit) and are compared against the
        // current name; suggested names don't, and are ranked instead.
        const isVariants = Boolean(s.items?.[0]?.note);
        return (
          <section key={s.id ?? i}>
            <h2 className="font-display text-base text-gold mb-2">
              {s.id ? t(`reports.sectionHeading.${s.id}`, { defaultValue: s.heading }) : s.heading}
            </h2>
            {s.hook && (
              <p className="mb-3 border-l-2 border-gold/40 pl-3 font-display text-[15px] leading-snug text-gold/90">
                {s.hook}
              </p>
            )}
            <div className="space-y-2.5">
              {s.paragraphs.map((p, j) => (
                <p key={j} className="text-sm text-foreground/85 leading-relaxed">
                  {p}
                </p>
              ))}
            </div>
            <div className="mt-3 flex flex-col gap-3">
              {s.items!.map((item, j) => (
                <NameSuggestionCard
                  key={j}
                  item={item}
                  rank={isVariants ? undefined : j + 1}
                  currentName={isVariants ? currentName : undefined}
                />
              ))}
            </div>
          </section>
        );
      })}

      <AnalysisAccordion
        sections={writtenSections}
        sectionIcon={SECTION_ICON}
        titleKey="nameChangeReport.analysis.title"
      />

      {verdict && <ReportVerdictCard verdict={verdict} />}
    </>
  );
}
