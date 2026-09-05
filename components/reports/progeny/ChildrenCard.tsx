"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Users } from "lucide-react";
import Card from "@/components/ui/Card";
import StatusPill from "@/components/ui/StatusPill";
import type { PillTone } from "@/components/ui/StatusPill";
import type { ChildrenCardView, Tendency } from "@/lib/progeny-report-view";

const TENDENCY_TONE: Record<Tendency, PillTone> = {
  male: "neutral",
  female: "neutral",
  inconclusive: "muted",
};

/**
 * The age-gated (35+) retrospective card -- see jyotish-backend's progeny.ts
 * `computeChildrenCard` doc comment for why this only ever exists for a reader 35 or older, and
 * why it is worded as the chart reading back children the reader most likely already has, never
 * as predicting an unborn child's sex. `childrenCard` is `null` for every buyer under 35, so this
 * component's own presence on the page already IS the age gate -- no age math needed here.
 */
export default function ChildrenCard({ card }: { card: ChildrenCardView | null }) {
  const { t } = useTranslation();
  const [imgError, setImgError] = useState(false);
  if (!card) return null;

  return (
    <Card className="overflow-hidden">
      <div className="relative h-24 w-full bg-muted/10">
        {!imgError && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/progeny/children.png"
            alt=""
            aria-hidden
            onError={() => setImgError(true)}
            className="h-full w-full object-cover"
          />
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold mb-2">
          <Users size={12} />
          {t("progenyReport.childrenCard.title")}
        </div>
        <p className="text-[11px] leading-relaxed text-muted mb-3">
          {t("progenyReport.childrenCard.intro", { count: card.likelyCount })}
        </p>
        <div className="flex flex-col gap-2">
          {card.sequence.map((slot) => (
            <div key={slot.index} className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-foreground">
                {t("progenyReport.sequence.child", { index: slot.index })}
              </span>
              <StatusPill tone={TENDENCY_TONE[slot.tendency]}>
                {t(`progenyReport.sequence.tendency.${slot.tendency}`)}
                {" · "}
                {t(`progenyReport.sequence.confidence.${slot.confidence}`)}
              </StatusPill>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
