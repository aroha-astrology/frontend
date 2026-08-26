"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock, Heart, HeartHandshake, Shield, UserRound, type LucideIcon } from "lucide-react";
import StatusPill, { strengthPillTone } from "@/components/ui/StatusPill";
import type { HighlightTile } from "@/lib/marriage-report-view";

/** Lucide fallback per tile, used when the sliced artwork is missing. */
const FALLBACK_ICON: Record<string, LucideIcon> = {
  potential: HeartHandshake,
  compatibility: Heart,
  timing: Clock,
  spouse: UserRound,
  stability: Shield,
};

function TileIcon({ tileKey }: { tileKey: string }) {
  const [imgError, setImgError] = useState(false);
  const Fallback = FALLBACK_ICON[tileKey] ?? Heart;
  if (imgError) return <Fallback size={18} className="text-gold shrink-0" aria-hidden />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/highlights/${tileKey}.png`}
      alt=""
      aria-hidden
      onError={() => setImgError(true)}
      className="h-[18px] w-[18px] shrink-0 object-contain"
    />
  );
}

/**
 * The five at-a-glance tiles under the outlook card. Each tile shows either a
 * colored strength pill or a short piece of text (an age range, a partner
 * archetype) — never both, and an em dash when that score is absent, so a gap in
 * the data reads as unknown rather than as a bad result.
 *
 * The "N positive - N caution" counter summarises the tiles' own tones; an
 * `average` reading is deliberately counted as neither.
 */
export default function HighlightTiles({
  tiles,
  positiveCount,
  cautionCount,
}: {
  tiles: HighlightTile[];
  positiveCount: number;
  cautionCount: number;
}) {
  const { t } = useTranslation();

  return (
    <section>
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <h2 className="font-display text-base text-gold">{t("marriageReport.highlights.title")}</h2>
        <span className="text-[10px] text-muted shrink-0">
          {t("marriageReport.highlights.counter", { positive: positiveCount, caution: cautionCount })}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {tiles.map((tile) => (
          <div
            key={tile.key}
            className="rounded-2xl border border-gold/15 bg-card p-3 flex flex-col gap-1.5"
          >
            <div className="flex items-center gap-2">
              <TileIcon tileKey={tile.key} />
              <span className="text-[11px] leading-snug text-foreground/80">
                {t(`marriageReport.highlights.${tile.key}`)}
              </span>
            </div>

            {tile.strength !== null ? (
              <StatusPill tone={strengthPillTone(tile.strength)} className="self-start">
                {t(`marriageReport.strength.${tile.strength}`)}
              </StatusPill>
            ) : (
              <span className="text-xs font-semibold text-foreground leading-tight">
                {tile.text ?? t("marriageReport.noValue")}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
