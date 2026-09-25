"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ChevronRight, Crown, MessageCircle } from "lucide-react";
import Card from "@/components/ui/Card";
import { useNewFeature } from "@/hooks/useFeature";
import { formatRupees } from "@/lib/format";
import { shortDate } from "@/lib/calendar-format";
import { passApi, PLAY_SUBSCRIPTIONS_URL, type PassStatus } from "@/lib/pass-api";

/**
 * The subscription on the payment page: the running Aroha Pass (renewal date,
 * questions left, manage in Google Play), or the offer with a link to /pass.
 * The Pass is paid through Google Play only, never from the wallet shown above
 * it. Renders nothing while the Pass (nav.arohaPass) is off or can't be offered.
 */
export default function PassSummaryCard({ className = "" }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const { enabled } = useNewFeature("nav.arohaPass");
  const [status, setStatus] = useState<PassStatus | null>(null);

  useEffect(() => {
    if (!enabled) return;
    passApi
      .status()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, [enabled]);

  if (!enabled || !status || (!status.pass && !status.offer)) return null;
  const { pass, offer } = status;

  return (
    <div className={className} data-testid="pass-summary">
      <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted mb-3">{t("pass.summary.title")}</p>
      <Card className="p-4 border-gold/25 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-gold">
            <Crown size={15} />
            {t("pass.title")}
          </p>
          {pass ? (
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
              {t("pass.summary.active")}
            </span>
          ) : (
            offer && <span className="text-sm font-semibold text-foreground">{t("pass.perMonth", { price: formatRupees(offer.pricePaise) })}</span>
          )}
        </div>

        {pass ? (
          <>
            <p className="text-sm text-foreground/90">
              {pass.source === "google_play" && pass.autoRenew
                ? t("pass.active.renews", { date: shortDate(pass.periodEnd.slice(0, 10), i18n.language) })
                : t("pass.active.until", { date: shortDate(pass.periodEnd.slice(0, 10), i18n.language) })}
            </p>
            <p className="flex items-center gap-1.5 text-sm text-foreground/90">
              <MessageCircle size={14} className="text-gold" />
              {t("pass.active.questionsLeft", { count: pass.questionsLeft, total: status.benefits.questionsPerPeriod })}
            </p>
            <p className="text-[11px] text-muted">
              {pass.source === "google_play" ? t("pass.active.sourcePlay") : t("pass.active.walletEnds")}
            </p>
            <div className="flex items-center justify-between pt-1">
              {pass.source === "google_play" ? (
                <a href={PLAY_SUBSCRIPTIONS_URL} className="text-xs font-medium text-gold underline underline-offset-2">
                  {t("pass.active.manage")}
                </a>
              ) : (
                <span />
              )}
              <Link href="/pass" className="inline-flex items-center gap-0.5 text-xs font-medium text-gold">
                {t("pass.summary.details")}
                <ChevronRight size={14} />
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-foreground/85 leading-relaxed">
              {t("pass.summary.pitch", { count: status.benefits.questionsPerPeriod })}
            </p>
            <p className="text-[11px] text-muted">{t("pass.playOnly")}</p>
            <Link
              href="/pass"
              className="mt-1 block w-full rounded-full bg-yellow-500 py-2.5 text-center text-sm font-semibold text-black"
            >
              {t("pass.summary.see")}
            </Link>
          </>
        )}
      </Card>
    </div>
  );
}
