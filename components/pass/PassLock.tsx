"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ArrowRight, Crown, Lock } from "lucide-react";
import Card from "@/components/ui/Card";
import PassBenefits from "@/components/pass/PassBenefits";
import { usePassStatus } from "@/hooks/usePassStatus";
import { formatRupees } from "@/lib/format";
import { offerFor, type PassFeature } from "@/lib/pass-api";

/**
 * Stands in for an Aroha Pass-only feature (voice call, Life Timeline, Bonds,
 * Decisions, Find My Date, the birth-time check, Relocation) when the server answers
 * PASS_REQUIRED: the user has no Pass, or one whose tier doesn't include
 * `need`. It leads with one line on why the feature is worth having, names the
 * cheapest Pass that opens it, and its button goes to /pass with that tier
 * picked out. The Pass is a Google Play subscription and is never paid from the
 * wallet, so the button only goes to /pass, which subscribes (or upgrades) on
 * Android and says where to subscribe everywhere else. `compact` drops the
 * benefits list, for cards that sit inside another page.
 */
export default function PassLock({
  feature,
  need,
  note,
  compact = false,
  className = "",
}: {
  /** The locked feature's name, e.g. t("timeline.title"). */
  feature: string;
  /** Which Pass feature this is: decides which tier the lock asks for. */
  need: PassFeature;
  /** A line of terms under the headline, e.g. the voice call's free minutes and price. */
  note?: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  // undefined while loading; null when the Pass can't be offered (off for this user, or it failed).
  const status = usePassStatus();

  const offer = status ? offerFor(status, need) : null;
  const soon = status === null || (status !== undefined && !offer);
  // Every tier includes it when the cheapest one on offer does: then it is simply "part of Aroha Pass".
  const everyTier = offer !== null && offer === status?.offers[0];
  const passName = offer ? t(`pass.tier.${offer.tier}`) : "";

  return (
    <Card
      className={`relative overflow-hidden border-gold/35 p-5 text-center ${className}`}
      data-testid="pass-lock"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-gold/15 via-transparent to-transparent"
        aria-hidden
      />
      <div className="relative space-y-3">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gold">
          {offer ? <Crown size={12} /> : <Lock size={12} />}
          {offer && !everyTier ? passName : t("pass.title")}
        </p>
        <p className="text-xl font-display leading-snug text-foreground" data-testid="pass-lock-hook">
          {t(`pass.lock.hook.${need}`)}
        </p>
        <p className="text-sm text-foreground/85">
          {offer && !everyTier
            ? t("pass.lock.titleTier", { feature, pass: passName })
            : t("pass.lock.title", { feature })}
        </p>
        {note && <p className="text-xs leading-relaxed text-foreground/75">{note}</p>}
        {soon ? (
          <p className="text-xs text-muted">{t("pass.lock.soon")}</p>
        ) : (
          offer && (
            <>
              <Link
                href={`/pass?tier=${offer.tier}`}
                data-testid="pass-lock-cta"
                className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 py-3 text-sm font-bold text-black active:scale-[0.98] transition-transform"
              >
                {status?.pass
                  ? t("pass.upgradeTo", { pass: passName })
                  : everyTier
                    ? t("pass.lock.getPass")
                    : t("pass.lock.unlockWith", { pass: passName })}
                <ArrowRight size={16} />
              </Link>
              <p className="text-[11px] text-muted">
                {t("pass.lock.price", { price: formatRupees(offer.pricePaise) })}
              </p>
            </>
          )
        )}
        {/* Below the button, so the way in is on screen without scrolling. */}
        {!compact && offer && (
          <div className="rounded-2xl border border-gold/15 bg-background/40 p-3">
            <PassBenefits benefits={offer} />
          </div>
        )}
      </div>
    </Card>
  );
}
