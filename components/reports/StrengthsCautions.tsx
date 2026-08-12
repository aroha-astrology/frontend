"use client";

import { useTranslation } from "react-i18next";
import { AlertTriangle, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DoshaYogaSummary } from "@/lib/report-score-facts";

/** Green for the yogas working in your favour, amber for the doshas to watch —
 * the same emerald/amber families as StatusPill, not a new palette. */
const COLUMN_STYLE = {
  positives: { panel: "border-emerald-500/20 bg-emerald-500/[0.06]", head: "text-emerald-400" },
  cautions: { panel: "border-amber-500/20 bg-amber-500/[0.06]", head: "text-amber-400" },
} as const;

function Column({
  kind,
  title,
  entries,
}: {
  kind: keyof typeof COLUMN_STYLE;
  title: string;
  entries: { label: string; detail: string }[];
}) {
  const style = COLUMN_STYLE[kind];
  const Icon = kind === "positives" ? Check : AlertTriangle;

  return (
    <div className={cn("rounded-2xl border p-3", style.panel)}>
      <h3 className={cn("text-xs font-semibold mb-2", style.head)}>{title}</h3>
      <ul className="flex flex-col gap-2">
        {entries.map((e, i) => (
          <li key={i} className="flex gap-1.5">
            <Icon size={13} className={cn("mt-0.5 shrink-0", style.head)} aria-hidden />
            <span className="min-w-0">
              <span className="block text-[11px] font-medium leading-snug text-foreground/90">{e.label}</span>
              {e.detail && <span className="block text-[10px] leading-snug text-muted mt-0.5">{e.detail}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface StrengthsCautionsProps {
  summary: DoshaYogaSummary;
  /** i18n keys for the two column headings — passed in rather than hardcoded, since each
   * bespoke report screen names these in its own namespace (same reason AnalysisAccordion
   * takes a `titleKey`). */
  strengthsKey: string;
  cautionsKey: string;
}

/**
 * The mock's paired Strengths / Cautions panels, mapped straight onto the report's
 * own dosha/yoga summary — `positives` are the detected yogas, `cautions` the
 * detected doshas, each already carrying a label and a one-line detail.
 *
 * A column with no entries is dropped rather than rendered empty, and the remaining
 * one spans the full width; a chart with no cautions should read as good news, not
 * as a broken panel.
 */
export default function StrengthsCautions({
  summary,
  strengthsKey,
  cautionsKey,
}: StrengthsCautionsProps) {
  const { t } = useTranslation();
  const hasPositives = summary.positives.length > 0;
  const hasCautions = summary.cautions.length > 0;
  if (!hasPositives && !hasCautions) return null;

  return (
    <section className={cn("grid gap-2", hasPositives && hasCautions ? "grid-cols-2" : "grid-cols-1")}>
      {hasPositives && (
        <Column kind="positives" title={t(strengthsKey)} entries={summary.positives} />
      )}
      {hasCautions && (
        <Column kind="cautions" title={t(cautionsKey)} entries={summary.cautions} />
      )}
    </section>
  );
}
