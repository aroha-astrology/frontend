"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import { useAuth } from "@/providers/auth-provider";
import { useFeature } from "@/hooks/useFeature";
import { ApiError } from "@/lib/api";
import { formatRupees } from "@/lib/format";
import { purgeUserCache } from "@/lib/cache";
import { palmApi } from "@/lib/palm-api";
import PalmCoverageList from "./PalmCoverageList";

interface PalmUnlockDrawerProps {
  readingId: string;
  onClose: () => void;
  onUnlocked: () => void;
}

/** Simpler sibling of ReportPurchaseDrawer.tsx — one price, no partner/monthly modes, since
 * palm has exactly one paid action (unlock the full interpretation for an already-scanned
 * reading). Same insufficient-balance / confirm-step / error-mapping shape. */
export default function PalmUnlockDrawer({ readingId, onClose, onUnlocked }: PalmUnlockDrawerProps) {
  const { t } = useTranslation();
  const { user, refresh } = useAuth();
  const costPaise = useFeature("paid.palmReading").pricePaise ?? 9900;
  const balancePaise = user?.walletBalancePaise ?? 0;
  const insufficient = balancePaise < costPaise;

  const [confirming, setConfirming] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  return (
    <BottomSheetModal
      onClose={onClose}
      closeLabel={t("common.close")}
      header={
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{t("palm.unlock.title")}</p>
          <p className="text-xs text-gold font-bold">{formatRupees(costPaise)}</p>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-xs text-muted leading-relaxed">{t("palm.unlock.body")}</p>

        {/* The price is attached to a stated list of what gets answered, not a vague promise. */}
        <PalmCoverageList title={t("palm.coverage.title")} />

        {insufficient ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-amber-400 text-center">
              {t("palm.unlock.notEnough", { cost: formatRupees(costPaise), amount: formatRupees(balancePaise) })}
            </p>
            <Link
              href="/payment"
              className="w-full flex items-center justify-center rounded-2xl bg-gold text-[#1a0e00] px-4 py-3 text-sm font-bold"
            >
              {t("palm.unlock.getCredits")}
            </Link>
          </div>
        ) : confirming ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-foreground text-center">
              {t("palm.unlock.confirmSpend", { cost: formatRupees(costPaise) })}
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
                className="flex-1 rounded-xl bg-gold text-[#1a0e00] px-4 py-2.5 text-sm font-bold disabled:opacity-50"
              >
                {unlocking ? t("palm.unlock.processing") : t("palm.unlock.confirmYes")}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="w-full rounded-2xl bg-gold text-[#1a0e00] px-4 py-3 text-sm font-bold"
          >
            {t("palm.unlock.cta")} · {formatRupees(costPaise)}
          </button>
        )}

        {errorMsg && <p className="text-[11px] text-red-400 text-center">{errorMsg}</p>}
      </div>
    </BottomSheetModal>
  );
}
