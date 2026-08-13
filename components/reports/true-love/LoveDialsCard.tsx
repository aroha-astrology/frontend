"use client";

import { useTranslation } from "react-i18next";
import Card from "@/components/ui/Card";
import type { Dial, LoveBand } from "@/lib/true-love-report-view";

/** Ring color per band — the same emerald/amber/grey family OutlookCard and the status
 * pills use, so the three report screens read as one system. */
const BAND_COLOR: Record<LoveBand, string> = {
  excellent: "#34d399",
  good: "#fbbf24",
  average: "#a1a1aa",
};

/** A sibling of marriage's BigScoreRing, sized down so two fit side by side — this report
 * scores romance and partnership separately, and showing only one would hide the more
 * interesting case where they disagree. */
function Dial({ dial, labelKey }: { dial: Dial; labelKey: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex-1 flex flex-col items-center gap-1.5">
      <div
        className="h-[62px] w-[62px] rounded-full grid place-items-center"
        style={{
          background: `conic-gradient(${BAND_COLOR[dial.band]} ${dial.score * 3.6}deg, rgba(120,120,120,0.18) 0deg)`,
        }}
      >
        <div className="h-[50px] w-[50px] rounded-full bg-card grid place-items-center">
          <span className="text-base font-bold text-foreground leading-none">{dial.score}</span>
        </div>
      </div>
      <span className="text-[11px] text-muted text-center leading-tight">{t(labelKey)}</span>
    </div>
  );
}

export interface LoveDialsCardProps {
  romance: Dial | null;
  partnership: Dial | null;
  /** The report's own one-line summary (scores.verdict.headline), already translated. */
  headline: string | null;
}

/**
 * The screen's headline card: the two scores this report computes separately (romance from
 * the 5th lord + Venus, partnership from the 7th lord + Venus) and the report's one-line
 * verdict. Each dial hides on its own when its score is missing, rather than rendering a
 * zeroed ring that would read as a terrible result instead of an absent one.
 */
export default function LoveDialsCard({ romance, partnership, headline }: LoveDialsCardProps) {
  const { t } = useTranslation();
  if (!romance && !partnership && !headline) return null;

  return (
    <Card className="p-4">
      <h2 className="font-display text-sm text-foreground">{t("trueLoveReport.dials.title")}</h2>
      {headline && <p className="text-[11px] leading-snug text-muted mt-1.5">{headline}</p>}

      {(romance || partnership) && (
        <div className="flex items-start gap-3 mt-3.5">
          {romance && <Dial dial={romance} labelKey="trueLoveReport.dials.romance" />}
          {partnership && <Dial dial={partnership} labelKey="trueLoveReport.dials.partnership" />}
        </div>
      )}
    </Card>
  );
}
