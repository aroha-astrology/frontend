"use client";

import { useTranslation } from "react-i18next";
import Card from "@/components/ui/Card";
import type { AgeBand } from "@/lib/report-score-facts";

/**
 * Same confidence-badge coloring as TimingWindowsCard, plus a distinct
 * dashed/dimmed style for NONE (no age-band confidence data at all — not the
 * same thing as a real LOW-confidence reading). Dashed-border pattern
 * matches BirthProfilePickerSheet.tsx / ProfileSwitcher.tsx's existing
 * `border-dashed` convention for a muted/placeholder state.
 */
const CONFIDENCE_STYLES: Record<AgeBand["confidence"], string> = {
  HIGH: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
  MEDIUM: "border-amber-500/25 bg-amber-500/10 text-amber-400",
  LOW: "border-border bg-muted/10 text-muted",
  NONE: "border-dashed border-border/50 bg-transparent text-muted/50",
};

/**
 * Stacked-row age-band table — one row per band with a confidence badge.
 * Renders a "nothing notable" message rather than a blank gap for an empty
 * list (defensive: buildScoreFact only ever produces a non-empty `bands`
 * array, but this component may also be used directly).
 */
export default function AgeBandTable({ bands }: { bands: AgeBand[] }) {
  const { t } = useTranslation();

  if (bands.length === 0) {
    return (
      <Card className="p-3">
        <p className="text-[11px] text-muted">{t("reports.facts.emptyState")}</p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col divide-y divide-border/50 p-3">
      {bands.map((b, i) => (
        <div
          key={`${b.label}-${i}`}
          className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0"
        >
          <span className="text-xs font-medium text-foreground">{b.label}</span>
          <span
            className={`shrink-0 inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-medium ${CONFIDENCE_STYLES[b.confidence]}`}
          >
            {t(`reports.facts.level.${b.confidence.toLowerCase()}`)}
          </span>
        </div>
      ))}
    </Card>
  );
}
