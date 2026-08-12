"use client";

import { cn } from "@/lib/utils";
import type { Strength, Tone } from "@/lib/marriage-report-view";

/**
 * Four-state pill vocabulary. The three colored variants are copied VERBATIM from
 * TimingWindowsCard.tsx's LEVEL_STYLES / PeriodBlock.tsx's PERIOD_TONE_STYLES
 * (border/25, bg/10, text/400) so this reads as the same visual language rather
 * than a fourth independent color scheme; `muted` reuses PERIOD_TONE_STYLES.LOW
 * for "we have no value for this", which must not look like a bad result.
 */
export type PillTone = Tone | "muted";

export const PILL_TONE_STYLES: Record<PillTone, string> = {
  positive: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
  neutral: "border-amber-500/25 bg-amber-500/10 text-amber-400",
  caution: "border-red-500/25 bg-red-500/10 text-red-400",
  muted: "border-border bg-muted/10 text-muted",
};

/**
 * Strength -> pill color. Distinct from lib/marriage-report-view.ts's `strengthTone`,
 * which answers a different question: that one is for COUNTING ("is this a plus or a
 * watch-out?", where `average` is neither and so is neutral alongside a missing value).
 * This one is for COLORING, where a real `average` reading earns amber but a missing
 * value must stay grey rather than implying a middling result we never computed.
 */
export function strengthPillTone(strength: Strength | null): PillTone {
  if (strength === null) return "muted";
  if (strength === "strong") return "positive";
  if (strength === "weak") return "caution";
  return "neutral";
}

export interface StatusPillProps {
  /** Already-translated label — no i18n happens in here. */
  children: React.ReactNode;
  tone: PillTone;
  className?: string;
}

/** Small rounded status chip. Presentation only; the caller resolves label and tone. */
export default function StatusPill({ children, tone, className }: StatusPillProps) {
  return (
    <span
      className={cn(
        "shrink-0 inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-medium",
        PILL_TONE_STYLES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
