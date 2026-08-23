"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { api, type DailyRewardState } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { formatRupees } from "@/lib/format";
import Card from "@/components/ui/Card";
import RewardCoin from "@/components/rewards/RewardCoin";
import { cn } from "@/lib/utils";

type ClaimStatus = "idle" | "claiming" | "error";

/**
 * The 7-day streak ladder: shared between the once-a-day popup
 * (DailyRewardModal) and the /rewards page — same data, same claim action,
 * different chrome around it. Fetches its own state so either mount works
 * standalone; the caller doesn't need to thread loading/error handling.
 */
export default function DailyRewardLadder() {
  const { t } = useTranslation();
  const { refresh } = useAuth();
  const [state, setState] = useState<DailyRewardState | null>(null);
  const [status, setStatus] = useState<ClaimStatus>("idle");

  const load = () => {
    api
      .getDailyReward()
      .then(setState)
      .catch(() => setState(null));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const claim = async () => {
    setStatus("claiming");
    try {
      await api.claimDailyReward();
      await refresh();
      load();
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  };

  if (!state) {
    return (
      <div className="flex justify-center py-10 text-muted">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }

  const { ladder, currentDay, claimedToday, todayAmountPaise, nextDayAmountPaise } = state;
  // The ladder only exposes each day's total; the bonus-only portion of day 7's amount is the
  // difference from what the plain +₹1/day progression would have paid — see rewards.service.ts's
  // amountForDay (base + (day-1)*100, plus the bonus only on day 7).
  const bonusOnlyPaise =
    ladder.length === 7 ? ladder[6]!.amountPaise - (ladder[5]!.amountPaise + 100) : 0;

  return (
    <Card className="p-5">
      <p className="text-xs uppercase tracking-wide text-muted text-center mb-4">
        {t("rewards.eyebrow")}
      </p>

      <div className="grid grid-cols-7 gap-1.5">
        {ladder.map((slot) => {
          const isToday = slot.day === currentDay;
          const bright = slot.claimed || isToday;
          return (
            <div key={slot.day} className="flex flex-col items-center gap-1">
              <div className={cn(isToday && !slot.claimed && "animate-pulse")}>
                <RewardCoin bright={bright} size={36} />
              </div>
              <span className={cn("text-[10px]", isToday ? "text-gold font-semibold" : "text-muted")}>
                {formatRupees(slot.amountPaise)}
              </span>
              {slot.isBonusDay && (
                <span className="text-[8px] text-gold/80 leading-none">
                  {t("rewards.bonusBadge", { amount: formatRupees(bonusOnlyPaise) })}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <Image src="/rewards/divider.png" alt="" width={480} height={65} className="w-full h-auto my-4 opacity-70" />

      {claimedToday ? (
        <p className="text-center text-sm text-foreground">
          {t("rewards.claimedBody", { amount: formatRupees(nextDayAmountPaise) })}
        </p>
      ) : (
        <button
          type="button"
          onClick={claim}
          disabled={status === "claiming"}
          className="w-full py-3 rounded-xl bg-gold/15 border border-gold/40 text-gold text-sm font-medium hover:bg-gold/25 transition-colors disabled:opacity-60"
        >
          {status === "claiming"
            ? t("rewards.claiming")
            : t("rewards.claimCta", { amount: formatRupees(todayAmountPaise) })}
        </button>
      )}

      {status === "error" && (
        <p className="text-center text-xs text-red-400 mt-2">{t("rewards.error")}</p>
      )}
    </Card>
  );
}
