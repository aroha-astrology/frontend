"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Crown, Lock } from "lucide-react";
import Card from "@/components/ui/Card";
import PassBenefits from "@/components/pass/PassBenefits";
import { useNewFeature } from "@/hooks/useFeature";
import { formatRupees } from "@/lib/format";
import { offerFor, passApi, type PassFeature, type PassStatus } from "@/lib/pass-api";

/**
 * Stands in for an Aroha Pass-only feature (voice call, Life Timeline, Bonds,
 * Decisions, Find My Date, the birth-time check, Relocation) when the server answers
 * PASS_REQUIRED: the user has no Pass, or one whose tier doesn't include
 * `need`. It names the cheapest Pass that does. The Pass is a Google Play
 * subscription and is never paid from the wallet, so the button only goes to
 * /pass, which subscribes (or upgrades) on Android and says where to subscribe
 * everywhere else. `compact` drops the benefits list, for cards that sit
 * inside another page.
 */
export default function PassLock({
  feature,
  need,
  compact = false,
  className = "",
}: {
  /** The locked feature's name, e.g. t("timeline.title"). */
  feature: string;
  /** Which Pass feature this is: decides which tier the lock asks for. */
  need: PassFeature;
  compact?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const { enabled: passOn } = useNewFeature("nav.arohaPass");
  // undefined while loading; null when the Pass can't be offered (no tier on, or it failed).
  const [status, setStatus] = useState<PassStatus | null | undefined>(undefined);

  useEffect(() => {
    if (!passOn) return;
    passApi
      .status()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, [passOn]);

  const offer = status ? offerFor(status, need) : null;
  const soon = !passOn || status === null || (status !== undefined && !offer);
  // Every tier includes it when the cheapest one on offer does: then it is simply "part of Aroha Pass".
  const everyTier = offer !== null && offer === status?.offers[0];

  return (
    <Card className={`space-y-3 border-gold/25 p-5 text-center ${className}`} data-testid="pass-lock">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-gold/15">
        <Lock size={18} className="text-gold" />
      </div>
      <p className="text-base font-semibold text-foreground">
        {offer && !everyTier
          ? t("pass.lock.titleTier", { feature, pass: t(`pass.tier.${offer.tier}`) })
          : t("pass.lock.title", { feature })}
      </p>
      {!compact && offer && <PassBenefits benefits={offer} />}
      {offer && (
        <p className="flex items-center justify-center gap-1.5 text-xs text-gold">
          <Crown size={13} />
          {t("pass.lock.price", { price: formatRupees(offer.pricePaise) })}
        </p>
      )}
      {soon ? (
        <p className="text-xs text-muted">{t("pass.lock.soon")}</p>
      ) : (
        <Link
          href="/pass"
          className="block w-full rounded-full bg-yellow-500 py-3 text-sm font-semibold text-black"
        >
          {t(status?.pass ? "pass.lock.upgrade" : "pass.lock.subscribe")}
        </Link>
      )}
    </Card>
  );
}
