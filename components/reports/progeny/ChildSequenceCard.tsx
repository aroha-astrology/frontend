"use client";

import { useTranslation } from "react-i18next";
import { Baby, ShieldAlert } from "lucide-react";
import Card from "@/components/ui/Card";
import StatusPill from "@/components/ui/StatusPill";
import type { PillTone } from "@/components/ui/StatusPill";
import type { ChildSlotView, Tendency } from "@/lib/progeny-report-view";

/** Never a verdict -- a tendency reads as a lean, not an answer, so it takes the same neutral
 * tone regardless of which way it leans (see TiltGauge's LEAN_TONE for the same reasoning). */
const TENDENCY_TONE: Record<Tendency, PillTone> = {
  male: "neutral",
  female: "neutral",
  inconclusive: "muted",
};

/**
 * The classical D7 child sequence, one chip per slot -- sex shown ONLY as a tendency+confidence
 * pill (never "Boy"/"Girl" flatly), per this report's core framing rule. An obstruction score of
 * 2+ (node/Saturn/Mars) surfaces a small caution icon -- a modifier to hold in mind, never a
 * "this child will not happen" claim.
 */
export default function ChildSequenceCard({ slots }: { slots: ChildSlotView[] }) {
  const { t } = useTranslation();
  if (slots.length === 0) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold mb-2.5">
        <Baby size={12} />
        {t("progenyReport.sequence.title")}
      </div>
      <div className="flex flex-col gap-2">
        {slots.map((slot) => (
          <div
            key={slot.index}
            className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-muted/5 p-3"
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">
                {t("progenyReport.sequence.child", { index: slot.index })}
              </p>
              <p className="text-[11px] text-muted">{slot.sign}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {slot.obstructionScore >= 2 && (
                <ShieldAlert size={13} className="text-amber-400" aria-hidden />
              )}
              <StatusPill tone={TENDENCY_TONE[slot.tendency]}>
                {t(`progenyReport.sequence.tendency.${slot.tendency}`)}
                {" · "}
                {t(`progenyReport.sequence.confidence.${slot.confidence}`)}
              </StatusPill>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2.5 text-[10px] leading-relaxed text-muted">
        {t("progenyReport.sequence.disclaimer")}
      </p>
    </Card>
  );
}
