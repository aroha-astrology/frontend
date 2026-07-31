"use client";

import { useTranslation } from "react-i18next";
import Card from "@/components/ui/Card";
import { ScoreRing } from "./ReportScoreFacts";
import { formatWindowDate } from "./TimingWindowsCard";
import type { LifeContextValue, LifeContextDomain } from "@/lib/report-score-facts";

const TONE_TEXT_COLOR: Record<LifeContextDomain["tone"], string> = {
  favorable: "text-emerald-400",
  mixed: "text-amber-400",
  challenging: "text-red-400",
};

function DomainRow({ domain }: { domain: LifeContextDomain }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface/40 p-3">
      <ScoreRing value={domain.score} max={100} pct={domain.score} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground">
            {t(`reports.lifeContext.domain.${domain.domain}`)}
          </span>
          <span className={`text-[10px] font-medium ${TONE_TEXT_COLOR[domain.tone]}`}>
            {t(`reports.facts.tone.${domain.tone}`)}
          </span>
        </div>
        {domain.nextWindow && (
          <p className="mt-0.5 text-[10px] leading-snug text-muted">
            {t("reports.lifeContext.nextWindow")}: {formatWindowDate(domain.nextWindow.startDate)} –{" "}
            {formatWindowDate(domain.nextWindow.endDate)}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Cross-domain "what else is happening in your chart right now" read — the fix for a report
 * type only ever looking at its own life area (e.g. a Marriage Report having zero career
 * content). Same field name (`lifeContext`) and shape on every report type — see
 * jyotish-backend's report-life-context.ts.
 */
export default function LifeContextCard({ lifeContext }: { lifeContext: LifeContextValue }) {
  const { t } = useTranslation();

  return (
    <Card className="flex flex-col gap-3 p-3.5">
      {lifeContext.currentMahadasha && lifeContext.currentAntardasha && (
        <p className="text-[11px] text-muted">
          {t("reports.lifeContext.currentPeriod")}: {lifeContext.currentMahadasha} /{" "}
          {lifeContext.currentAntardasha}
          {lifeContext.endsOn &&
            ` · ${t("reports.lifeContext.endsUntil", { date: formatWindowDate(lifeContext.endsOn) })}`}
        </p>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {lifeContext.domains.map((d) => (
          <DomainRow key={d.domain} domain={d} />
        ))}
      </div>
    </Card>
  );
}
