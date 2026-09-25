"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Crown, Lock } from "lucide-react";
import Card from "@/components/ui/Card";
import PassBenefits from "@/components/pass/PassBenefits";
import { useNewFeature } from "@/hooks/useFeature";
import { formatRupees } from "@/lib/format";
import { passApi, type PassStatus } from "@/lib/pass-api";

/**
 * Stands in for an Aroha Pass-only feature (Life Timeline, Bonds, Decisions,
 * Find My Date, the birth-time check, Relocation) when the server answers
 * PASS_REQUIRED. The Pass is a Google Play subscription and is never paid from
 * the wallet, so the button only goes to /pass, which subscribes on Android and
 * says where to subscribe everywhere else. `compact` drops the benefits list,
 * for cards that sit inside another page.
 */
export default function PassLock({
  feature,
  compact = false,
  className = "",
}: {
  /** The locked feature's name, e.g. t("timeline.title"). */
  feature: string;
  compact?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const { enabled: passOn } = useNewFeature("nav.arohaPass");
  // undefined while loading; null when the Pass can't be offered (no price variant on, or it failed).
  const [status, setStatus] = useState<PassStatus | null | undefined>(undefined);

  useEffect(() => {
    if (!passOn) return;
    passApi
      .status()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, [passOn]);

  const offer = status?.offer ?? null;
  const soon = !passOn || status === null || (status !== undefined && !offer);

  return (
    <Card className={`space-y-3 border-gold/25 p-5 text-center ${className}`} data-testid="pass-lock">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-gold/15">
        <Lock size={18} className="text-gold" />
      </div>
      <p className="text-base font-semibold text-foreground">{t("pass.lock.title", { feature })}</p>
      {!compact && status?.benefits && <PassBenefits benefits={status.benefits} />}
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
          {t("pass.lock.subscribe")}
        </Link>
      )}
    </Card>
  );
}
