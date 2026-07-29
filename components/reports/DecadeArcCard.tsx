"use client";

import { useTranslation } from "react-i18next";
import Card from "@/components/ui/Card";
import { ScoreRing } from "./ReportScoreFacts";
import DecadeArcChart from "./DecadeArcChart";
import type { DecadeBand } from "@/lib/report-score-facts";

/**
 * Tone-badge coloring for the decade-by-decade arc: favorable=emerald,
 * mixed=amber, challenging=red — this shape's own tone vocabulary
 * (favorable/mixed/challenging) is distinct from horoscope/quality's
 * (good/moderate/challenging/avoid), so it gets its own mapping rather than
 * reusing QUALITY_BADGE_KEYS verbatim; the color FAMILIES still follow this
 * app's existing convention of green=good / amber=caution / red=concern
 * (see DoshaCard.tsx's SEVERITY_COLORS, vastu's `cautions` amber).
 */
const TONE_STYLES: Record<DecadeBand["tone"], string> = {
  favorable: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
  mixed: "border-amber-500/25 bg-amber-500/10 text-amber-400",
  challenging: "border-red-500/25 bg-red-500/10 text-red-400",
};

function formatDecadeDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

/**
 * A single-series score-over-time chart (DecadeArcChart — line/area, one
 * hue), then one row per decade band below it: label + date range, the same
 * ring visual ReportScoreFacts.tsx already uses for a plain 0-100 numeric
 * fact (reused via its named export for visual consistency), and a
 * tone-colored badge. That per-decade row list IS the "row below the chart"
 * of labelled tone chips the dataviz skill calls for — DecadeArcChart itself
 * doesn't repeat the tone badges, it only draws the trend.
 * Renders a "nothing notable" message rather than a blank gap for an empty
 * list (defensive: buildScoreFact only ever produces a non-empty `bands`
 * array, but this component may also be used directly).
 */
export default function DecadeArcCard({ bands }: { bands: DecadeBand[] }) {
  const { t } = useTranslation();

  if (bands.length === 0) {
    return (
      <Card className="p-3">
        <p className="text-[11px] text-muted">{t("reports.facts.emptyStateDecadeArc")}</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Card className="p-3">
        <DecadeArcChart bands={bands} />
      </Card>
      {bands.map((b, i) => (
        <Card key={`${b.label}-${i}`} className="flex items-center justify-between gap-3 p-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-foreground">{b.label}</p>
            <p className="mt-0.5 text-[10px] text-muted">
              {formatDecadeDate(b.startDate)} – {formatDecadeDate(b.endDate)}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <ScoreRing value={Math.round(b.score)} max={100} pct={Math.round(b.score)} />
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-medium ${TONE_STYLES[b.tone]}`}
            >
              {t(`reports.facts.tone.${b.tone}`)}
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
}
