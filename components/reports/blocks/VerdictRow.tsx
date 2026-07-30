"use client";

import { cn } from "@/lib/utils";
import { PERIOD_TONE_STYLES, type PeriodTone } from "./PeriodBlock";

export interface VerdictRowProps {
  /** Left-hand title, e.g. "Overall Compatibility". */
  title: string;
  /** Caller-resolved/translated pill text, e.g. "Favorable". Rendered as-is. */
  status: string;
  /**
   * Drives the pill color. Reuses the SAME HIGH/MEDIUM/LOW /
   * favorable/mixed/challenging badge convention as PeriodBlock (itself
   * copied from TimingWindowsCard.tsx / DecadeArcCard.tsx), so a verdict
   * pill never introduces a new color family — see PERIOD_TONE_STYLES.
   */
  tone: PeriodTone;
  className?: string;
}

/**
 * A title + status-pill row, e.g. a report's headline verdict
 * ("Overall Compatibility" -> "Favorable"). The pill is the exact
 * rounded-full border+bg+text badge idiom this app already uses for a
 * title-plus-colored-pill row (see DecadeArcCard.tsx's per-band layout, and
 * ReportCard.tsx's purchased-month chips for the same rounded-full
 * border-tinted pill shape), reused here via PERIOD_TONE_STYLES rather than
 * a new pill design.
 */
export default function VerdictRow({ title, status, tone, className }: VerdictRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-2xl border border-gold/15 bg-card p-3",
        className,
      )}
    >
      <span className="min-w-0 truncate text-sm font-semibold text-foreground">{title}</span>
      <span
        className={cn(
          "inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[10px] font-medium",
          PERIOD_TONE_STYLES[tone].badge,
        )}
      >
        {status}
      </span>
    </div>
  );
}
