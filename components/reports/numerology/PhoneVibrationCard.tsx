"use client";

import { useTranslation } from "react-i18next";
import Card from "@/components/ui/Card";
import { ScoreRing } from "../ReportScoreFacts";
import type { MobileNumberAnalysisValue } from "@/lib/report-score-facts";

/** Same emerald/amber/red/muted convention as StatusPill.tsx's PILL_TONE_STYLES, inlined
 * rather than imported — that component's PillTone type is coupled to marriage-report-view's
 * Strength/Tone types, which don't fit this report's own MobileVerdict enum. */
const VERDICT_TONE: Record<MobileNumberAnalysisValue["verdict"], string> = {
  powerful: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
  supportive: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
  neutral: "border-amber-500/25 bg-amber-500/10 text-amber-400",
  draining: "border-red-500/25 bg-red-500/10 text-red-400",
};

/**
 * The current phone number's vibration + harmony reading — masked number, the numeral its
 * digits reduce to, a harmony ring (reuses ReportScoreFacts' own ScoreRing meter, scaled from
 * the 1-10 harmony score), and a verdict pill. `maskedNumber` is the ONLY representation of
 * the reader's number this component (or its data) ever sees — see
 * MobileNumberAnalysisValue's own doc comment.
 */
export default function PhoneVibrationCard({ analysis }: { analysis: MobileNumberAnalysisValue }) {
  const { t } = useTranslation();

  return (
    <Card className="p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider text-muted">
            {t("numerologyReport.phone.numberLabel")}
          </span>
          <span className="font-display text-lg text-foreground tabular-nums tracking-wide">
            {analysis.maskedNumber}
          </span>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${VERDICT_TONE[analysis.verdict]}`}
        >
          {t(`numerologyReport.phone.verdict.${analysis.verdict}`)}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-gold/15 bg-gold/[0.04] px-3 py-2.5">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider text-muted">
            {t("numerologyReport.phone.vibrationLabel")}
          </span>
          <span className="font-display text-3xl leading-none text-gold tabular-nums">
            {analysis.vibration}
          </span>
        </div>
        <ScoreRing value={analysis.harmony} max={10} pct={Math.round(analysis.harmony * 10)} />
      </div>
    </Card>
  );
}
