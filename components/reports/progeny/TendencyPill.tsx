"use client";

import { useTranslation } from "react-i18next";
import StatusPill from "@/components/ui/StatusPill";
import type { PillTone } from "@/components/ui/StatusPill";
import type { Tendency, Confidence } from "@/lib/progeny-report-view";

/** Never a verdict -- a tendency reads as a lean, not an answer, so it takes the same neutral
 * tone regardless of which way it leans (see TiltGauge's LEAN_TONE for the same reasoning). */
const TENDENCY_TONE: Record<Tendency, PillTone> = {
  male: "neutral",
  female: "neutral",
  inconclusive: "muted",
};

/**
 * Tendency + confidence, stacked: a short pill ("Leans female") over the confidence as plain
 * muted text. Both used to sit inside ONE pill joined by a middot, which on a phone ran wider
 * than half the row -- ragged pill edges down the column and, in the sequence card, a wrapped
 * "Child 3" beside it. Splitting them keeps every pill within a few characters of the next and
 * costs no new i18n keys (the confidence strings already read as standalone captions).
 */
export default function TendencyPill({
  tendency,
  confidence,
}: {
  tendency: Tendency;
  confidence: Confidence;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <StatusPill tone={TENDENCY_TONE[tendency]}>
        {t(`progenyReport.sequence.tendency.${tendency}`)}
      </StatusPill>
      <span className="text-[9px] text-muted">
        {t(`progenyReport.sequence.confidence.${confidence}`)}
      </span>
    </div>
  );
}
