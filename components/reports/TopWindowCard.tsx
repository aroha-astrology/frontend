"use client";

import { useTranslation } from "react-i18next";
import Card from "@/components/ui/Card";
import StatusPill from "@/components/ui/StatusPill";
import TimingWindowsCurve from "./TimingWindowsCurve";
import { formatWindowDate, filterInformativeReasoning } from "./TimingWindowsCard";
import type { RankedWindow } from "@/lib/report-score-facts";
import type { PillTone } from "@/components/ui/StatusPill";

/** RankedWindow confidence -> pill tone, keeping the same emerald/amber/grey reading
 * as TimingWindowsCard's LEVEL_STYLES rather than introducing a second mapping. */
const LEVEL_TONE: Record<RankedWindow["level"], PillTone> = {
  HIGH: "positive",
  MEDIUM: "neutral",
  LOW: "muted",
};

/**
 * The headline window for a report: exact dates, confidence, the backend's plain-English
 * one-liner, and the shared-axis curve of every ranked window beneath it.
 *
 * `windows` arrives pre-sorted from the backend, so `top` is simply the first — the
 * curve still shows all of them so a near-term window is never hidden behind the
 * highest-scoring one.
 *
 * Falls back to the filtered `reasoning` bullets when `summary` is absent, exactly as
 * TimingWindowsCard does (an older report, or a failed summary call).
 */
export interface TopWindowCardProps {
  windows: RankedWindow[];
  /** i18n key for the section heading — each report names its timing section itself. */
  titleKey: string;
  /** i18n key for the caption above the dates ("Strong period for marriage"). */
  labelKey: string;
}

export default function TopWindowCard({ windows, titleKey, labelKey }: TopWindowCardProps) {
  const { t } = useTranslation();
  const top = windows[0];
  if (!top) return null;

  const reasoning = top.summary ? [] : filterInformativeReasoning(top.reasoning);

  return (
    <section>
      <h2 className="font-display text-base text-gold mb-2">{t(titleKey)}</h2>
      <Card className="p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] text-muted">{t(labelKey)}</p>
            <p className="text-base font-display text-gold mt-0.5">
              {formatWindowDate(top.startDate)} – {formatWindowDate(top.endDate)}
            </p>
          </div>
          <StatusPill tone={LEVEL_TONE[top.level]}>
            {t(`reports.facts.level.${top.level.toLowerCase()}`)}
          </StatusPill>
        </div>

        {top.summary ? (
          <p className="text-[12px] leading-relaxed text-foreground/80">{top.summary}</p>
        ) : (
          reasoning.length > 0 && (
            <ul className="flex flex-col gap-0.5">
              {reasoning.map((r, i) => (
                <li key={i} className="flex gap-1.5 text-[11px] leading-snug text-muted">
                  <span className="shrink-0 text-gold/60">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          )
        )}

        {windows.length > 1 && (
          <div className="pt-1 border-t border-gold/10">
            <TimingWindowsCurve windows={windows} />
          </div>
        )}
      </Card>
    </section>
  );
}
