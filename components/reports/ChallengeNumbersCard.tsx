"use client";

import { useTranslation } from "react-i18next";
import ForecastTable from "./ForecastTable";
import type { ChallengeNumbersValue } from "@/lib/report-score-facts";

/** 4 numbered tiles (first/second/main/fourth challenge) plus the life-phase table each one
 * applies to — replaces the generic nested-fact renderer's flattened "Phase: 1 · Age Range: 0
 * 29 · Challenge: 4," string with an actual table. */
export default function ChallengeNumbersCard({ value }: { value: ChallengeNumbersValue }) {
  const { t } = useTranslation();

  const tiles: { labelKey: string; num: number }[] = [
    { labelKey: "reports.facts.numerology.firstChallenge", num: value.first },
    { labelKey: "reports.facts.numerology.secondChallenge", num: value.second },
    { labelKey: "reports.facts.numerology.mainChallenge", num: value.main },
    { labelKey: "reports.facts.numerology.fourthChallenge", num: value.fourth },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-4 gap-2">
        {tiles.map((tile) => (
          <div
            key={tile.labelKey}
            className="flex flex-col items-center gap-1 rounded-2xl border border-gold/15 bg-card p-2.5"
          >
            <span className="text-lg font-bold text-gold">{tile.num}</span>
            <span className="text-center text-[9px] uppercase tracking-wide text-muted leading-tight">
              {t(tile.labelKey)}
            </span>
          </div>
        ))}
      </div>

      <ForecastTable
        rows={value.phases}
        columns={[
          { key: "phase", labelKey: "reports.facts.numerology.colPhase" },
          { key: "ageRange", labelKey: "reports.facts.numerology.colAgeRange" },
          { key: "challenge", labelKey: "reports.facts.numerology.colChallenge" },
        ]}
      />
    </div>
  );
}
