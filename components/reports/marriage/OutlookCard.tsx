"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { HeartHandshake } from "lucide-react";
import Card from "@/components/ui/Card";

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

export interface OutlookCardProps {
  /** The report's own one-line summary (scores.verdict.headline), already translated. */
  headline: string | null;
}

/**
 * The screen's headline card: just the report's own one-line verdict. No score/ring —
 * deliberately unquantified per product decision to drop the numeric marriage score.
 */
export default function OutlookCard({ headline }: OutlookCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="p-4 flex items-center gap-3.5">
      <OutlookGlyph />
      <div className="flex-1 min-w-0">
        <h2 className="font-display text-sm text-foreground">{t("marriageReport.outlook.title")}</h2>
        {headline && <p className="text-[11px] leading-snug text-muted mt-1.5">{headline}</p>}
      </div>
    </Card>
  );
}
