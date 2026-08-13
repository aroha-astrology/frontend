"use client";

import { useTranslation } from "react-i18next";
import { Heart, Users } from "lucide-react";
import Card from "@/components/ui/Card";
import StatusPill from "@/components/ui/StatusPill";
import type { Tilt } from "@/lib/true-love-report-view";
import type { PillTone } from "@/components/ui/StatusPill";

/** Neither end of this axis is a good or bad result — a love-leaning chart is not better
 * than an arranged-leaning one — so both directions take the same neutral amber and only
 * the wide middle reads as grey. Deliberately NOT the emerald/red severity vocabulary the
 * other cards use, which would imply a verdict this axis does not carry. */
const LEAN_TONE: Record<Tilt["lean"], PillTone> = {
  love: "neutral",
  balanced: "muted",
  arranged: "neutral",
};

/**
 * Where the chart sits on the love-marriage <-> arranged-marriage axis, as a marker on a
 * two-ended track rather than a filled progress bar: a filled bar would read as "72% of a
 * good thing", when the number is a direction, not an amount.
 *
 * The raw 0-10 value is never shown. See the `Tilt` doc in lib/true-love-report-view.ts for
 * why the underlying formula does not support finer reading than three directions.
 */
export default function TiltGauge({ tilt }: { tilt: Tilt }) {
  const { t } = useTranslation();

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="font-display text-sm text-foreground flex-1">
          {t("trueLoveReport.tilt.title")}
        </h2>
        <StatusPill tone={LEAN_TONE[tilt.lean]}>
          {t(`trueLoveReport.tilt.lean.${tilt.lean}`)}
        </StatusPill>
      </div>

      <div className="relative h-1.5 rounded-full bg-gradient-to-r from-sky-500/30 via-border to-rose-500/30">
        <div
          className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-gold bg-card"
          style={{ left: `${tilt.pct}%` }}
        />
      </div>

      <div className="flex items-center justify-between mt-2">
        <span className="flex items-center gap-1 text-[10px] text-muted">
          <Users size={11} aria-hidden />
          {t("trueLoveReport.tilt.arranged")}
        </span>
        <span className="flex items-center gap-1 text-[10px] text-muted">
          {t("trueLoveReport.tilt.love")}
          <Heart size={11} aria-hidden />
        </span>
      </div>
    </Card>
  );
}
