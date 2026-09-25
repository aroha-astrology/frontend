"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ChevronRight, HeartHandshake } from "lucide-react";
import Card from "@/components/ui/Card";
import { useNewFeature } from "@/hooks/useFeature";
import { bondsApi, PHASE_CLASS, type BondSummary } from "@/lib/bonds-api";
import { isPassRequired } from "@/lib/pass-api";
import { RELATIONSHIP_KEYS } from "@/components/ProfileSwitcher";
import PassLock from "@/components/pass/PassLock";

/**
 * Home's Aroha Bonds card (home.bondsCard, ships off): up to three people with
 * a score and where the bond stands. Aroha Pass only — without the Pass it
 * shows the compact subscribe lock instead.
 */
export default function BondsCard() {
  const { t } = useTranslation();
  const { enabled } = useNewFeature("home.bondsCard");
  const { enabled: pageOn } = useNewFeature("nav.bonds");
  const [bonds, setBonds] = useState<BondSummary[] | null>(null);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    bondsApi
      .list()
      .then((res) => !cancelled && setBonds(res.bonds))
      .catch((err: unknown) => {
        if (cancelled) return;
        setBonds(null);
        setLocked(isPassRequired(err));
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  if (enabled && locked) return <PassLock feature={t("bonds.title")} compact />;
  if (!enabled || bonds === null) return null;
  const ready = bonds.filter((b) => b.ready).slice(0, 3);

  return (
    <Card className="p-5 border-gold/15" data-testid="bonds-card">
      <p className="flex items-center gap-2 text-gold text-xs font-medium uppercase tracking-wider mb-3">
        <HeartHandshake size={14} />
        {t("bonds.card.title")}
      </p>
      {ready.length === 0 ? (
        <Link href="/onboarding?mode=new-profile" className="text-sm text-foreground/85 underline underline-offset-2">
          {t("bonds.card.add")}
        </Link>
      ) : (
        <ul className="space-y-2">
          {ready.map((b) => {
            const row = (
              <>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">{b.name || t("bonds.unnamed")}</span>
                  <span className="block text-[11px] text-muted">
                    {b.relationship ? t(RELATIONSHIP_KEYS[b.relationship]) : ""}
                  </span>
                </span>
                {b.compatibility && <span className="text-sm font-semibold text-gold">{b.compatibility.pct}%</span>}
                {b.phase && (
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] ${PHASE_CLASS[b.phase]}`}>
                    {t(`bonds.phase.${b.phase}`)}
                  </span>
                )}
              </>
            );
            return (
              <li key={b.profileId}>
                {pageOn ? (
                  <Link href={`/bonds?id=${b.profileId}`} className="flex items-center gap-3">
                    {row}
                  </Link>
                ) : (
                  <div className="flex items-center gap-3">{row}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {pageOn && ready.length > 0 && (
        <Link href="/bonds" className="mt-3 flex items-center justify-end gap-0.5 text-[11px] font-medium text-gold">
          {t("bonds.card.seeAll")}
          <ChevronRight size={12} />
        </Link>
      )}
    </Card>
  );
}
