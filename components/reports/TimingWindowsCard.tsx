"use client";

import { useTranslation } from "react-i18next";
import Card from "@/components/ui/Card";
import TimingWindowsGantt from "./TimingWindowsGantt";
import ConfidenceLegend from "./ConfidenceLegend";
import type { RankedWindow } from "@/lib/report-score-facts";

/**
 * HIGH/MEDIUM/LOW confidence badge coloring — matches DoshaCard.tsx's
 * severity-tinted border+bg+text convention (border/25, bg/10, text/400).
 * Exported so TimingWindowsGantt.tsx's compact per-row pill reuses the exact
 * same classes rather than inventing a second HIGH/MEDIUM/LOW color mapping.
 */
export const LEVEL_STYLES: Record<RankedWindow["level"], string> = {
  HIGH: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
  MEDIUM: "border-amber-500/25 bg-amber-500/10 text-amber-400",
  LOW: "border-border bg-muted/10 text-muted",
};

/**
 * Fixed-locale date formatting, matching DashaTimeline.tsx's `formatDate` and
 * lib/reports-logic.ts's `formatPeriodMonth` convention: dates render in a
 * fixed locale, not translated per UI language. Exported so
 * TimingWindowsGantt.tsx's shared-timeline axis ticks use the same format.
 */
export function formatWindowDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

/**
 * Fallback for a window with no persisted `summary` (a report generated before the
 * window-summary feature shipped, or a failed LLM call — see report-score-facts.ts's
 * `RankedWindow.summary` doc comment). Drops the near-guaranteed non-informative boilerplate
 * lines `dasha-confidence.ts`'s `yoginiAlignment`/`transitAlignment` produce when a signal
 * couldn't be determined (reports always score transit alignment against a null transit by
 * design — see report-timing.ts), keeping only the real Vimshottari anchor fact and any
 * genuinely-aligned line. These exact substrings are cross-referenced against
 * jyotish-backend's src/lib/astro-engine/dasha-confidence.ts — if that file's wording changes,
 * update this list too.
 */
const NON_INFORMATIVE_REASONING_SUBSTRINGS = [
  "could not determine",
  "position unknown",
  "not scored",
  "does not strongly trigger",
  "Ascendant unknown",
];

export function filterInformativeReasoning(reasoning: string[]): string[] {
  return reasoning.filter(
    (line) => !NON_INFORMATIVE_REASONING_SUBSTRINGS.some((substr) => line.includes(substr)),
  );
}

/**
 * A shared-timeline Gantt strip (TimingWindowsGantt — each window's bar
 * positioned by its own start/end date, level shown as a pill), then one
 * card per ranked timing window below it: exact date range, a confidence
 * badge, and the `reasoning` bullets. The Gantt gives the "which windows
 * overlap/come first" shape at a glance; the retained per-window cards below
 * still carry the exact dates and reasoning text a chart can't hold.
 * Renders a "nothing notable" message rather than a blank gap for an empty
 * list (defensive: buildScoreFact only ever produces a non-empty `windows`
 * array, but this component may also be used directly).
 */
export default function TimingWindowsCard({ windows }: { windows: RankedWindow[] }) {
  const { t } = useTranslation();

  if (windows.length === 0) {
    return (
      <Card className="p-3">
        <p className="text-[11px] text-muted">{t("reports.facts.emptyStateWindows")}</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ConfidenceLegend />
      <Card className="p-3">
        <TimingWindowsGantt windows={windows} />
      </Card>
      {windows.map((w, i) => (
        <Card key={`${w.startDate}-${w.endDate}-${i}`} className="p-3 flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-foreground">
              {formatWindowDate(w.startDate)} – {formatWindowDate(w.endDate)}
            </span>
            <span
              className={`shrink-0 inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-medium ${LEVEL_STYLES[w.level]}`}
            >
              {t(`reports.facts.level.${w.level.toLowerCase()}`)}
            </span>
          </div>

          <p className="text-[10px] leading-snug text-muted">
            {t(`reports.facts.confidenceCaption.${w.level.toLowerCase()}`)}
          </p>

          {w.summary ? (
            <p className="mt-0.5 text-[11px] leading-snug text-foreground/80">{w.summary}</p>
          ) : (
            (() => {
              const informative = filterInformativeReasoning(w.reasoning);
              return (
                informative.length > 0 && (
                  <ul className="flex flex-col gap-0.5 mt-0.5">
                    {informative.map((r, ri) => (
                      <li key={ri} className="flex gap-1.5 text-[11px] leading-snug text-muted">
                        <span className="shrink-0 text-gold/60">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                )
              );
            })()
          )}
        </Card>
      ))}
    </div>
  );
}
