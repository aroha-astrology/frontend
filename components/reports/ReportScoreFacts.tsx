"use client";

import { useTranslation } from "react-i18next";
import { buildScoreFacts } from "@/lib/report-score-facts";

/**
 * Generic renderer for a report's `scores` payload — see
 * lib/report-score-facts.ts's doc comment for why this is one generic
 * renderer instead of 10 bespoke visualizations. Renders nothing if `scores`
 * is empty/absent/malformed rather than an empty grid.
 */
export default function ReportScoreFacts({ scores }: { scores: Record<string, unknown> | null | undefined }) {
  const { t } = useTranslation();
  const facts = buildScoreFacts(scores);
  if (facts.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3">
      {facts.map((f) => (
        <div key={f.key} className="rounded-2xl border border-gold/15 bg-card p-3 flex flex-col gap-1.5 min-w-0">
          <span className="text-[10px] uppercase tracking-wider text-muted truncate">{f.label}</span>

          {f.type === "ring" && <ScoreRing value={f.value} max={f.max} pct={f.pct} />}

          {f.type === "badge" && <span className="text-sm font-semibold text-gold">{f.value}</span>}

          {f.type === "boolean" && (
            <span
              className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${
                f.value ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
              }`}
            >
              {f.value ? t("common.yes") : t("common.no")}
            </span>
          )}

          {f.type === "nested" && (
            <div className="flex flex-col gap-0.5">
              {f.entries.map((e, i) => (
                <div key={i} className="flex justify-between gap-2 text-[11px] text-foreground/80">
                  <span className="text-muted shrink-0">{e.label}</span>
                  <span className="text-right truncate">{e.display}</span>
                </div>
              ))}
            </div>
          )}

          {f.type === "raw" && <span className="text-sm text-foreground">{f.value}</span>}
        </div>
      ))}
    </div>
  );
}

function ScoreRing({ value, max, pct }: { value: number; max: number; pct: number }) {
  const color = pct >= 66 ? "#34d399" : pct >= 40 ? "#fbbf24" : "#ef4444";
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-10 h-10 rounded-full grid place-items-center shrink-0"
        style={{ background: `conic-gradient(${color} ${pct * 3.6}deg, rgba(120,120,120,0.18) 0deg)` }}
      >
        <div className="w-7 h-7 rounded-full bg-card grid place-items-center">
          <span className="text-[9px] font-bold text-foreground">{pct}%</span>
        </div>
      </div>
      <span className="text-sm font-semibold text-foreground">
        {value}/{max}
      </span>
    </div>
  );
}
