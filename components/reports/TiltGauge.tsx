"use client";

import { useTranslation } from "react-i18next";
import Card from "@/components/ui/Card";
import StatusPill from "@/components/ui/StatusPill";
import type { LucideIcon } from "lucide-react";
import type { PillTone } from "@/components/ui/StatusPill";

/** The three-way reading every tilt shares: leaning one way, leaning the other, or genuinely
 * in the middle. `low`/`high` name the ENDS of the track, not good/bad. */
export type TiltLean = "low" | "mid" | "high";

export interface TiltValue {
  /** 0-100, marker position along the track. */
  pct: number;
  lean: TiltLean;
}

/** Neither end of a tilt axis is a good or bad result — a spending-leaning chart is not worse
 * than a saving-leaning one — so both directions take the same neutral amber and only the wide
 * middle reads as grey. Deliberately NOT the emerald/red severity vocabulary the other cards
 * use, which would imply a verdict these axes do not carry. */
const LEAN_TONE: Record<TiltLean, PillTone> = {
  low: "neutral",
  mid: "muted",
  high: "neutral",
};

export interface TiltGaugeProps {
  tilt: TiltValue;
  /** i18n key for the card heading. */
  titleKey: string;
  /** i18n key for the verdict pill — resolved as `${leanKeyPrefix}.${tilt.lean}`. */
  leanKeyPrefix: string;
  /** i18n keys for the two end labels. `lowKey` sits at 0%, `highKey` at 100%. */
  lowKey: string;
  highKey: string;
  LowIcon: LucideIcon;
  HighIcon: LucideIcon;
  /** Tailwind gradient classes for the track, e.g. "from-sky-500/30 via-border to-rose-500/30".
   * Passed in rather than fixed so each report can theme its own axis; must be literal classes
   * written at a call site, since Tailwind's JIT does not scan lib/. */
  trackClass: string;
}

/**
 * Where a chart sits on a two-ended axis, as a marker on a track rather than a filled progress
 * bar: a filled bar would read as "72% of a good thing", when the number is a direction, not an
 * amount.
 *
 * Shared because the backend computes several of these with the same idiom — true_love's
 * `loveVsArrangedTilt` and wealth's `spendingVsSavingTilt` are explicitly documented as the same
 * formula shape. The raw 0-10 value is never shown; see each report's view-model for why the
 * underlying formulas do not support finer reading than three directions.
 */
export default function TiltGauge({
  tilt,
  titleKey,
  leanKeyPrefix,
  lowKey,
  highKey,
  LowIcon,
  HighIcon,
  trackClass,
}: TiltGaugeProps) {
  const { t } = useTranslation();

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="font-display text-sm text-foreground flex-1">{t(titleKey)}</h2>
        <StatusPill tone={LEAN_TONE[tilt.lean]}>{t(`${leanKeyPrefix}.${tilt.lean}`)}</StatusPill>
      </div>

      <div className={`relative h-1.5 rounded-full bg-gradient-to-r ${trackClass}`}>
        <div
          className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-gold bg-card"
          style={{ left: `${tilt.pct}%` }}
        />
      </div>

      <div className="flex items-center justify-between mt-2">
        <span className="flex items-center gap-1 text-[10px] text-muted">
          <LowIcon size={11} aria-hidden />
          {t(lowKey)}
        </span>
        <span className="flex items-center gap-1 text-[10px] text-muted">
          {t(highKey)}
          <HighIcon size={11} aria-hidden />
        </span>
      </div>
    </Card>
  );
}
