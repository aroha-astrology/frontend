"use client";

import { useTranslation } from "react-i18next";
import { Sparkles, ArrowRight } from "lucide-react";
import Card from "@/components/ui/Card";
import type { ReportVerdictValue } from "@/lib/report-score-facts";

/**
 * Closing "Final Verdict" card — headline + key takeaways + a single next step, generated once
 * at report-generation time from the report's own already-computed facts (see jyotish-backend's
 * lib/llm/reports/verdict.ts). Renders directly from `scores.verdict` (see
 * app/reports/[id]/page.tsx) rather than through the generic facts grid, since it belongs at
 * the very bottom of the page, after every narrative section. Absent (renders nothing) for a
 * report generated before this feature shipped, or if that one generation-time LLM call failed
 * — see reports.service.ts's computeReportVerdict doc comment.
 */
export default function ReportVerdictCard({ verdict }: { verdict: ReportVerdictValue }) {
  const { t } = useTranslation();

  return (
    <Card className="flex flex-col gap-3 border-gold/25 bg-gold/[0.04] p-4">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">
        <Sparkles size={12} />
        {t("reports.verdict.title")}
      </div>

      <p className="font-display text-base leading-snug text-foreground">{verdict.headline}</p>

      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
          {t("reports.verdict.keyTakeaways")}
        </p>
        <ul className="flex flex-col gap-1.5">
          {verdict.bullets.map((b, i) => (
            <li key={i} className="flex gap-1.5 text-xs leading-relaxed text-foreground/85">
              <span className="mt-0.5 shrink-0 text-gold/60">•</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-gold/20 bg-gold/[0.06] p-2.5">
        <ArrowRight size={13} className="mt-0.5 shrink-0 text-gold" />
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted">
            {t("reports.verdict.yourNextStep")}
          </p>
          <p className="text-xs text-foreground/90">{verdict.nextStep}</p>
        </div>
      </div>
    </Card>
  );
}
