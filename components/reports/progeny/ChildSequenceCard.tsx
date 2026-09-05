"use client";

import { useTranslation } from "react-i18next";
import { Baby, ShieldAlert } from "lucide-react";
import Card from "@/components/ui/Card";
import TendencyPill from "./TendencyPill";
import type { ChildSlotView } from "@/lib/progeny-report-view";

/**
 * The classical D7 child sequence, one row per slot -- sex shown ONLY as a tendency+confidence
 * pill (never "Boy"/"Girl" flatly), per this report's core framing rule. An obstruction score of
 * 2+ (node/Saturn/Mars) surfaces a small caution icon -- a modifier to hold in mind, never a
 * "this child will not happen" claim.
 *
 * The label column is `whitespace-nowrap`: "Child 3" wrapping mid-row was the visible symptom of
 * the over-wide combined pill this card used to render (see TendencyPill).
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
            className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted/5 p-3"
          >
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-foreground">
                {t("progenyReport.sequence.child", { index: slot.index })}
                {slot.obstructionScore >= 2 && (
                  <ShieldAlert size={12} className="shrink-0 text-amber-400" aria-hidden />
                )}
              </p>
              <p className="truncate text-[11px] text-muted">{slot.sign}</p>
            </div>
            <TendencyPill tendency={slot.tendency} confidence={slot.confidence} />
          </div>
        ))}
      </div>
      <p className="mt-2.5 text-[10px] leading-relaxed text-muted">
        {t("progenyReport.sequence.disclaimer")}
      </p>
    </Card>
  );
}
