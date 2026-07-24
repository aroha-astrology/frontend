"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import Card from "@/components/ui/Card";
import StatusPill from "@/components/ui/StatusPill";
import { formatRupees } from "@/lib/format";
import type { Astrologer } from "@/lib/api";

/**
 * Directory row for one astrologer. Whole card is a `Link` to the detail
 * page (`/astrologers/[id]`), `active:scale-[0.98]` tap feedback matching
 * `Card.tsx`'s existing hover/tap convention (see `PromoLinkCard.tsx`).
 *
 * Competitor-informed (Astrotalk/Astroyogi/InstaAstro): specialties,
 * languages, and rate are all visible without a tap — the rate is never
 * hidden behind a click.
 */
export interface AstrologerCardProps {
  astrologer: Astrologer;
}

export default function AstrologerCard({ astrologer }: AstrologerCardProps) {
  const { t } = useTranslation();
  const initial = (astrologer.displayName || "?").trim().charAt(0).toUpperCase();

  return (
    <Link href={`/astrologers/${astrologer.id}`}>
      <Card
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="w-full p-4 hover:border-gold/40 cursor-pointer active:scale-[0.98] transition-transform"
      >
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden shrink-0">
            {astrologer.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={astrologer.photoUrl}
                alt={astrologer.displayName}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gradient-to-br from-gold/80 to-purple-600/60 flex items-center justify-center text-[#1a0e00] font-display text-lg">
                {initial}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground truncate">{astrologer.displayName}</h3>
              {astrologer.verified && <StatusPill tone="success" label={t("astrologers.verifiedBadge")} />}
            </div>

            {astrologer.specialties.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {astrologer.specialties.slice(0, 3).map((s) => (
                  <span key={s} className="border border-gold/10 text-muted rounded-full text-[11px] px-2.5 py-1">
                    {s}
                  </span>
                ))}
              </div>
            )}

            {astrologer.languages.length > 0 && (
              <p className="text-xs text-muted mt-1.5 truncate">{astrologer.languages.join(" · ")}</p>
            )}
          </div>

          <div className="shrink-0 text-right pl-1">
            <p className="text-sm font-semibold text-gold whitespace-nowrap">
              {formatRupees(astrologer.ratePaisePerSession)}
            </p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
