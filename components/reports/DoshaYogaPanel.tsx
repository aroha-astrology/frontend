"use client";

import { useTranslation } from "react-i18next";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import Card from "@/components/ui/Card";
import type { DoshaYogaSummary } from "@/lib/report-score-facts";

/**
 * Two-column (stacked on mobile) positives/cautions layout. Icon+color
 * choice matches this app's existing dosha-presentation convention rather
 * than inventing a new one: CheckCircle2/emerald for a positive and
 * AlertTriangle/amber for a caution mirror components/vastu/AnalysisPanel.tsx's
 * `positiveAspects` (CheckCircle2, emerald-400) and `cautions` (amber-400)
 * sections. `label`/`detail` here are deterministic astro-engine output, not
 * LLM prose (see report-dosha-yoga-summary.ts) — rendered as-is because the
 * backend already translates them server-side for non-English requests (see
 * SCORES_PROSE_ALLOWLIST in jyotish-backend's lib/llm/report-scores.ts), same
 * translate-on-read pattern as everything else in a report's `sections`.
 */
export default function DoshaYogaPanel({ summary }: { summary: DoshaYogaSummary }) {
  const { t } = useTranslation();
  const { positives, cautions } = summary;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Card className="p-3.5">
        <h4 className="mb-2.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
          <CheckCircle2 size={12} />
          {t("reports.facts.positivesTitle")}
        </h4>
        {positives.length === 0 ? (
          <p className="text-[11px] text-muted">{t("reports.facts.emptyStatePositives")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {positives.map((p, i) => (
              <li key={`${p.label}-${i}`} className="flex gap-2">
                <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-emerald-400" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground">{p.label}</p>
                  <p className="text-[11px] leading-relaxed text-muted">{p.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-3.5">
        <h4 className="mb-2.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400">
          <AlertTriangle size={12} />
          {t("reports.facts.cautionsTitle")}
        </h4>
        {cautions.length === 0 ? (
          <p className="text-[11px] text-muted">{t("reports.facts.emptyStateCautions")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {cautions.map((c, i) => (
              <li key={`${c.label}-${i}`} className="flex gap-2">
                <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-400" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground">{c.label}</p>
                  <p className="text-[11px] leading-relaxed text-muted">{c.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
