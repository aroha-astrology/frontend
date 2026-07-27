"use client";

import { cn } from "@/lib/utils";

/**
 * Shared confidence/tone vocabulary for a dated window or decade band. Covers
 * BOTH shapes this app already computes (see lib/report-score-facts.ts):
 * RankedWindow's uppercase HIGH/MEDIUM/LOW confidence and DecadeBand's
 * lowercase favorable/mixed/challenging tone. A caller passes whichever
 * vocabulary its data already uses — the two never collide as string keys,
 * so one prop type covers both without any translation/mapping step.
 */
export type PeriodTone = "HIGH" | "MEDIUM" | "LOW" | "favorable" | "mixed" | "challenging";

/**
 * Left-rule + badge color classes. The `badge` classes are copied VERBATIM
 * (not re-derived) from this app's two existing confidence/tone components,
 * so PeriodBlock reads as the same visual language rather than inventing a
 * third color scheme:
 *   - HIGH/MEDIUM/LOW  <- TimingWindowsCard.tsx's LEVEL_STYLES
 *     (components/reports/TimingWindowsCard.tsx:11-15), which itself matches
 *     DoshaCard.tsx's severity-tinted border+bg+text convention.
 *   - favorable/mixed/challenging <- DecadeArcCard.tsx's TONE_STYLES
 *     (components/reports/DecadeArcCard.tsx:17-21).
 * `rule` is a same-family extension (solid emerald/amber/red-400, or the
 * neutral `border` token for LOW) used only for this component's colored
 * left border — no new hues introduced.
 */
export const PERIOD_TONE_STYLES: Record<PeriodTone, { rule: string; badge: string }> = {
  HIGH: {
    rule: "border-l-emerald-400",
    badge: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
  },
  MEDIUM: {
    rule: "border-l-amber-400",
    badge: "border-amber-500/25 bg-amber-500/10 text-amber-400",
  },
  LOW: {
    rule: "border-l-border",
    badge: "border-border bg-muted/10 text-muted",
  },
  favorable: {
    rule: "border-l-emerald-400",
    badge: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
  },
  mixed: {
    rule: "border-l-amber-400",
    badge: "border-amber-500/25 bg-amber-500/10 text-amber-400",
  },
  challenging: {
    rule: "border-l-red-400",
    badge: "border-red-500/25 bg-red-500/10 text-red-400",
  },
};

export interface PeriodBlockProps {
  /** Short label, e.g. "MARRIAGE WINDOW" — rendered alongside the date range as one eyebrow line. */
  label: string;
  /** Caller-formatted date range, e.g. "2027-2030". Not parsed/formatted here. */
  dateRange: string;
  /** Drives the left-rule color — see PERIOD_TONE_STYLES. */
  tone: PeriodTone;
  /** Italic "why this matters" line. */
  why?: string;
  /** Plain actionable "what to do" line, rendered below `why`. */
  whatToDo?: string;
  className?: string;
}

/**
 * A single dated window/period: a colored left rule (confidence or tone), an
 * eyebrow line combining the label and date range ("LABEL - date range"), an
 * italic "why" line, and a plain "what to do" line underneath. Presentation
 * only — dates/tone/copy are all pre-resolved by the caller (e.g. from a
 * RankedWindow or DecadeBand), no date formatting or i18n logic lives here.
 */
export default function PeriodBlock({ label, dateRange, tone, why, whatToDo, className }: PeriodBlockProps) {
  const styles = PERIOD_TONE_STYLES[tone];
  return (
    <div className={cn("flex flex-col gap-1.5 rounded-xl border-l-4 bg-card p-3.5", styles.rule, className)}>
      <span className="text-[10px] uppercase tracking-wider text-muted">
        {label} · {dateRange}
      </span>
      {why && <p className="text-sm italic leading-relaxed text-foreground/85">{why}</p>}
      {whatToDo && <p className="text-[13px] leading-relaxed text-foreground/70">{whatToDo}</p>}
    </div>
  );
}
