"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Crown } from "lucide-react";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import { useAuth } from "@/providers/auth-provider";
import { useFeature } from "@/hooks/useFeature";
import { usePassStatus } from "@/hooks/usePassStatus";
import { ApiError } from "@/lib/api";
import { formatRupees } from "@/lib/format";
import { purgeUserCache } from "@/lib/cache";
import { shortDate } from "@/lib/calendar-format";
import { palmApi, type PalmAllowance } from "@/lib/palm-api";
import PalmCoverageList from "./PalmCoverageList";

interface PalmUnlockDrawerProps {
  readingId: string;
  /** From the reading itself: what unlocking costs this reader right now. Absent = not known yet. */
  allowance?: PalmAllowance;
  onClose: () => void;
  onUnlocked: () => void;
}

/**
 * The full palm reading is open to everyone (owner, 2026-10-24). It costs the normal price from
 * the wallet; an Aroha Pass member gets one free every Pass period (and an admin user group's
 * members are never limited). The photo scan stays free.
 *
 *  - free for this reader (member with the period's reading unused, or an admin group): confirm and
 *    unlock;
 *  - otherwise: the price, paid from the wallet (or "add credits" when it is short). A reader with
 *    no Pass is also told, once and kindly, that a Pass includes a free palm reading every month.
 */
export default function PalmUnlockDrawer({ readingId, allowance, onClose, onUnlocked }: PalmUnlockDrawerProps) {
  const { t, i18n } = useTranslation();
  const { user, refresh } = useAuth();
  const passStatus = usePassStatus();
  const palmPrice = useFeature("paid.palmReading").pricePaise;

  const costPaise = allowance?.pricePaise ?? palmPrice ?? 19900;
  const balancePaise = user?.walletBalancePaise ?? 0;

  // The server has the last word: this flips if an unlock was charged although it looked free.
  const [confirming, setConfirming] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const member = allowance?.passMember === true;
  const free = allowance?.unlimited === true || (member && (allowance?.left ?? 0) > 0);
  const insufficient = !free && balancePaise < costPaise;

  const handleUnlock = async () => {
    setErrorMsg(null);
    setUnlocking(true);
    try {
      await palmApi.unlock(readingId);
      await refresh();
      if (user) purgeUserCache(user.id, { scope: "palm" });
      onUnlocked();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setErrorMsg(t("palm.unlock.notEnough", { cost: formatRupees(costPaise), amount: formatRupees(balancePaise) }));
      } else if (err instanceof ApiError && err.status === 403) {
        setErrorMsg(t("palm.unlock.disabledError"));
      } else {
        setErrorMsg(t("palm.unlock.unlockError"));
      }
      setConfirming(false);
    } finally {
      setUnlocking(false);
    }
  };

  // A Google Play Pass renews on a known date; a group Pass has none the reader acts on.
  const pass = passStatus?.pass;
  const nextDate =
    pass?.source === "google_play" && pass.periodEnd ? shortDate(pass.periodEnd.slice(0, 10), i18n.language) : null;

  // The cheapest tier switched on, for the "why pay each time" line (none = no Pass to point to).
  const cheapestPass = passStatus?.offers?.[0]?.pricePaise;
  const showNudge = !member && !!cheapestPass;
  const samePrice = cheapestPass === costPaise;

  return (
    <BottomSheetModal
      onClose={onClose}
      closeLabel={t("common.close")}
      header={
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{t("palm.unlock.title")}</p>
          {free ? (
            <p className="inline-flex items-center gap-1 text-xs font-bold text-gold">
              <Crown size={12} />
              {allowance?.unlimited ? t("palm.unlock.freeUnlimited") : t("palm.pass.badge")}
            </p>
          ) : (
            <p className="text-xs text-gold font-bold">{formatRupees(costPaise)}</p>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-xs text-muted leading-relaxed">{t("palm.unlock.body")}</p>

        {/* What gets answered is listed before anything is asked of the reader. */}
        <PalmCoverageList title={t("palm.coverage.title")} />

        {!free && member && (
          <p className="text-xs text-amber-400 text-center" data-testid="palm-pass-used">
            {nextDate
              ? t("palm.unlock.usedPaidOn", { date: nextDate, price: formatRupees(costPaise) })
              : t("palm.unlock.usedPaid", { price: formatRupees(costPaise) })}
          </p>
        )}

        {insufficient ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-amber-400 text-center">
              {t("palm.unlock.notEnough", { cost: formatRupees(costPaise), amount: formatRupees(balancePaise) })}
            </p>
            <Link
              href="/payment"
              data-testid="palm-get-credits"
              className="w-full flex items-center justify-center rounded-2xl bg-gold text-[#1a0e00] px-4 py-3 text-sm font-bold"
            >
              {t("palm.unlock.getCredits")}
            </Link>
          </div>
        ) : confirming ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-foreground text-center">
              {free ? t("palm.pass.confirm") : t("palm.unlock.confirmSpend", { cost: formatRupees(costPaise) })}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={unlocking}
                className="flex-1 rounded-xl border border-gold/20 text-muted px-4 py-2.5 text-sm font-medium disabled:opacity-50"
              >
                {t("common.no")}
              </button>
              <button
                type="button"
                onClick={handleUnlock}
                disabled={unlocking}
                data-testid="palm-confirm-yes"
                className="flex-1 rounded-xl bg-gold text-[#1a0e00] px-4 py-2.5 text-sm font-bold disabled:opacity-50"
              >
                {unlocking ? t("palm.unlock.processing") : t("palm.unlock.confirmYes")}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {free && !allowance?.unlimited && (
              <p className="text-xs text-foreground/85 text-center">{t("palm.pass.included")}</p>
            )}
            <button
              type="button"
              onClick={() => setConfirming(true)}
              data-testid={free ? "palm-pass-unlock" : "palm-paid-unlock"}
              className="w-full rounded-2xl bg-gold text-[#1a0e00] px-4 py-3 text-sm font-bold"
            >
              {free ? t("palm.pass.cta") : `${t("palm.unlock.cta")} · ${formatRupees(costPaise)}`}
            </button>
          </div>
        )}

        {/* The Pass, offered in one friendly line, only to someone who has none. */}
        {showNudge && !free && (
          <div className="rounded-2xl border border-gold/25 bg-card p-3.5 text-center" data-testid="palm-pass-nudge">
            <p className="text-xs font-bold text-gold">{t("palm.unlock.passNudgeTitle")}</p>
            <p className="mt-1 text-xs leading-relaxed text-foreground/85">
              {t(samePrice ? "palm.unlock.passNudgeSame" : "palm.unlock.passNudge", { price: formatRupees(cheapestPass!) })}
            </p>
            <Link
              href="/pass?tier=silver"
              data-testid="palm-pass-nudge-cta"
              className="mt-2 inline-block text-xs font-semibold text-gold underline underline-offset-4"
            >
              {t("palm.unlock.passNudgeCta")}
            </Link>
          </div>
        )}

        {errorMsg && <p className="text-[11px] text-red-400 text-center">{errorMsg}</p>}
      </div>
    </BottomSheetModal>
  );
}
