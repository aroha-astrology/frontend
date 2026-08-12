"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { HeartHandshake } from "lucide-react";
import Card from "@/components/ui/Card";
import type { OutlookBand } from "@/lib/marriage-report-view";

/** Ring color per band, same emerald/amber family the status pills use. */
const BAND_COLOR: Record<OutlookBand, string> = {
  excellent: "#34d399",
  good: "#fbbf24",
  average: "#a1a1aa",
};

/**
 * Interlocked-rings artwork with a lucide fallback, mirroring PlanetIcon's swap.
 * The glyph is sliced from the design sheet's highlight row (see
 * scripts/assets/asset-manifest.json).
 */
function OutlookGlyph() {
  const [imgError, setImgError] = useState(false);
  if (imgError) return <HeartHandshake size={28} className="text-gold shrink-0" aria-hidden />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/marriage/ring.png"
      alt=""
      aria-hidden
      onError={() => setImgError(true)}
      className="h-12 w-12 shrink-0 object-contain"
    />
  );
}

/**
 * A bigger sibling of ReportScoreFacts' 40px `ScoreRing` — same conic-gradient
 * technique, sized for a headline card and colored by band rather than by the
 * generic 66/40 percentage thresholds.
 */
function BigScoreRing({ score, band }: { score: number; band: OutlookBand }) {
  const color = BAND_COLOR[band];
  return (
    <div
      className="h-[68px] w-[68px] shrink-0 rounded-full grid place-items-center"
      style={{ background: `conic-gradient(${color} ${score * 3.6}deg, rgba(120,120,120,0.18) 0deg)` }}
    >
      <div className="h-[56px] w-[56px] rounded-full bg-card grid place-items-center leading-none">
        <span className="text-lg font-bold text-foreground">{score}</span>
        <span className="text-[9px] text-muted mt-0.5">/100</span>
      </div>
    </div>
  );
}

export interface OutlookCardProps {
  score: number | null;
  band: OutlookBand | null;
  /** The report's own one-line summary (scores.verdict.headline), already translated. */
  headline: string | null;
}

/**
 * The screen's headline card: overall marriage score, its band, and the report's
 * own one-line verdict. Renders without the ring when the score is missing (an
 * older report predating the field) rather than showing a zeroed-out dial, which
 * would read as a terrible result instead of an absent one.
 */
export default function OutlookCard({ score, band, headline }: OutlookCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="p-4 flex items-center gap-3.5">
      <OutlookGlyph />
      <div className="flex-1 min-w-0">
        <h2 className="font-display text-sm text-foreground">{t("marriageReport.outlook.title")}</h2>
        {band && <p className="text-xs text-gold mt-0.5">{t(`marriageReport.outlook.band.${band}`)}</p>}
        {headline && <p className="text-[11px] leading-snug text-muted mt-1.5">{headline}</p>}
      </div>
      {score !== null && band && <BigScoreRing score={score} band={band} />}
    </Card>
  );
}
