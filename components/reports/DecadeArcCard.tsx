"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import Card from "@/components/ui/Card";
import DecadeArcChart from "./DecadeArcChart";
import type { DecadeBand } from "@/lib/report-score-facts";

interface DecadeBandWithUi extends DecadeBand {
  aiExplanation?: string;
}

/**
 * Tone-badge coloring for the arc: favorable=emerald, mixed=amber, challenging=red — this
 * app's green=good / amber=caution / red=concern convention (see DoshaCard.tsx's
 * SEVERITY_COLORS).
 */
const TONE_STYLES: Record<DecadeBand["tone"], string> = {
  favorable: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
  mixed: "border-amber-500/25 bg-amber-500/10 text-amber-400",
  challenging: "border-red-500/25 bg-red-500/10 text-red-400",
};

const TONE_DOT: Record<DecadeBand["tone"], string> = {
  favorable: "bg-emerald-400",
  mixed: "bg-amber-400",
  challenging: "bg-red-400",
};

const TONE_TEXT: Record<DecadeBand["tone"], string> = {
  favorable: "text-emerald-400",
  mixed: "text-amber-400",
  challenging: "text-red-400",
};

function formatDecadeDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

/**
 * The arc chart, then one card per band: label, date range and tone badge. No score is shown
 * anywhere — the number only shapes the chart line (product decision: reports show no scores).
 *
 * A band with `subPeriods` (Life So Far) lists them inside its card, so a long chapter such as
 * a 20-year Venus Mahadasha reads as its real sub-periods rather than one flat line.
 *
 * `collapsible` shows only the chart plus a one-line tone summary until the reader expands the
 * chapter list.
 */
export default function DecadeArcCard({
  bands,
  collapsible = false,
}: {
  bands: DecadeBandWithUi[];
  collapsible?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(!collapsible);

  if (bands.length === 0) {
    return (
      <Card className="p-3">
        <p className="text-[11px] text-muted">{t("reports.facts.emptyStateDecadeArc")}</p>
      </Card>
    );
  }

  const counts = { favorable: 0, mixed: 0, challenging: 0 };
  for (const b of bands) counts[b.tone] += 1;

  return (
    <div className="flex flex-col gap-3">
      <Card className="flex flex-col gap-2.5 p-3">
        <DecadeArcChart bands={bands} />
        {collapsible && (
          <div className="flex items-center justify-between gap-3 border-t border-gold/10 pt-2.5">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-muted">
              <span>
                {t("reports.facts.lifeArc.chapters", {
                  count: bands.length,
                  defaultValue: "{{count}} chapters",
                })}
              </span>
              {(["favorable", "mixed", "challenging"] as const)
                .filter((tone) => counts[tone] > 0)
                .map((tone) => (
                  <span key={tone} className="inline-flex items-center gap-1">
                    <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[tone]}`} aria-hidden />
                    {t(`reports.facts.tone.${tone}`)}
                  </span>
                ))}
            </div>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-gold/25 px-2.5 py-1 text-[10px] font-medium text-gold"
            >
              {open
                ? t("reports.facts.lifeArc.hide", { defaultValue: "Hide chapters" })
                : t("reports.facts.lifeArc.show", { defaultValue: "Show chapters" })}
              <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
            </button>
          </div>
        )}
      </Card>

      {open &&
        bands.map((b, i) => (
          <Card key={`${b.label}-${i}`} className="flex flex-col gap-2.5 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-foreground">{b.label}</p>
                <p className="mt-0.5 text-[10px] text-muted">
                  {formatDecadeDate(b.startDate)} – {formatDecadeDate(b.endDate)}
                </p>
              </div>
              <span
                className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[9px] font-medium ${TONE_STYLES[b.tone]}`}
              >
                {t(`reports.facts.tone.${b.tone}`)}
              </span>
            </div>

            {b.subPeriods && b.subPeriods.length > 1 && (
              <ul className="flex flex-col divide-y divide-gold/10 border-t border-gold/10">
                {b.subPeriods.map((s, j) => (
                  <li key={`${s.label}-${j}`} className="flex items-center gap-2 py-1.5 last:pb-0">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[s.tone]}`} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] text-foreground/90">{s.label}</p>
                      <p className="text-[9px] text-muted">
                        {formatDecadeDate(s.startDate)} – {formatDecadeDate(s.endDate)}
                      </p>
                    </div>
                    <span className={`shrink-0 text-[9px] font-medium ${TONE_TEXT[s.tone]}`}>
                      {t(`reports.facts.tone.${s.tone}`)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {b.aiExplanation && (
              <p className="text-[11px] leading-relaxed text-foreground/80 bg-foreground/5 p-2 rounded-lg border border-foreground/5">
                {b.aiExplanation}
              </p>
            )}
          </Card>
        ))}
    </div>
  );
}
