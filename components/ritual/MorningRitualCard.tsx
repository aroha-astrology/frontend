"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Check, Flame, Sunrise } from "lucide-react";
import Card from "@/components/ui/Card";
import { useRitual } from "@/hooks/useRitual";

/**
 * Home's Morning Ritual card (ritual.morning, ships off). Before the ritual it invites the reader in,
 * with the streak they would keep; once it is done it shrinks to a slim bar, so the rest of Home
 * moves up and the card is out of the way for the rest of the day.
 */
export default function MorningRitualCard() {
  const { t } = useTranslation();
  const { enabled, today } = useRitual();

  if (!enabled || !today) return null;

  if (today.completed) {
    return (
      <Link
        href="/ritual"
        className="flex h-12 items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 text-sm text-emerald-200"
        data-testid="ritual-bar"
      >
        <Check size={16} />
        <span className="min-w-0 flex-1 truncate">{t("ritual.barDone", { n: today.streak.run })}</span>
        <Flame size={14} className="text-orange-400" />
      </Link>
    );
  }

  return (
    <Link href="/ritual" className="block" data-testid="ritual-card">
      <Card className="p-5 border-gold/30">
        <p className="flex items-center gap-2 text-gold text-xs font-medium uppercase tracking-wider mb-2">
          <Sunrise size={14} />
          {t("ritual.title")}
        </p>
        <p className="text-base font-semibold text-foreground">{t("ritual.homeTitle")}</p>
        <p className="mt-1 text-xs text-muted">{t("ritual.homeSub")}</p>
        <div className="mt-3 flex items-center justify-between">
          {today.streak.run > 0 ? (
            <span className="flex items-center gap-1 text-xs text-muted">
              <Flame size={12} className="text-orange-400" />
              {t("ritual.homeStreak", { n: today.streak.run })}
            </span>
          ) : (
            <span />
          )}
          <span className="rounded-full bg-gold/20 px-4 py-1.5 text-sm font-semibold text-gold">{t("ritual.begin")}</span>
        </div>
      </Card>
    </Link>
  );
}
