"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Crown } from "lucide-react";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import PassLock from "@/components/pass/PassLock";
import { useAuth } from "@/providers/auth-provider";
import { usePassStatus } from "@/hooks/usePassStatus";
import { ApiError } from "@/lib/api";
import { purgeUserCache } from "@/lib/cache";
import { shortDate } from "@/lib/calendar-format";
import { isPassRequired } from "@/lib/pass-api";
import { palmApi, type PalmAllowance } from "@/lib/palm-api";
import PalmCoverageList from "./PalmCoverageList";

interface PalmUnlockDrawerProps {
  readingId: string;
  /** From the reading itself: whether the reader's Pass covers it now. Absent = not known yet. */
  allowance?: PalmAllowance;
  onClose: () => void;
  onUnlocked: () => void;
}

/**
 * The full palm reading is an Aroha Pass benefit (owner, 2026-10-23): every tier, one full
 * reading per Pass period, never paid from the wallet. The photo scan stays free. A member
 * confirms and uses this period's reading; a member who has used it is told when the next one
 * opens; anyone else sees the Pass lock, which leads to /pass.
 */
export default function PalmUnlockDrawer({ readingId, allowance, onClose, onUnlocked }: PalmUnlockDrawerProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const passStatus = usePassStatus();

  // The server has the last word: these flip when an unlock comes back 403.
  const [needPass, setNeedPass] = useState(false);
  const [usedUp, setUsedUp] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const member = !needPass && (allowance ? allowance.passMember : true);
  const left = usedUp ? 0 : (allowance?.left ?? 1);

  const handleUnlock = async () => {
    setErrorMsg(null);
    setUnlocking(true);
    try {
      await palmApi.unlock(readingId);
      if (user) purgeUserCache(user.id, { scope: "palm" });
      onUnlocked();
    } catch (err) {
      if (isPassRequired(err)) setNeedPass(true);
      else if (err instanceof ApiError && err.status === 403 && err.message === "PALM_PERIOD_LIMIT") setUsedUp(true);
      else if (err instanceof ApiError && err.status === 403) setErrorMsg(t("palm.unlock.disabledError"));
      else setErrorMsg(t("palm.unlock.unlockError"));
      setConfirming(false);
    } finally {
      setUnlocking(false);
    }
  };

  // A Google Play Pass renews on a known date; a group Pass has none the reader acts on.
  const pass = passStatus?.pass;
  const nextDate =
    pass?.source === "google_play" && pass.periodEnd ? shortDate(pass.periodEnd.slice(0, 10), i18n.language) : null;

  return (
    <BottomSheetModal
      onClose={onClose}
      closeLabel={t("common.close")}
      header={
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{t("palm.unlock.title")}</p>
          {member && (
            <p className="inline-flex items-center gap-1 text-xs font-bold text-gold">
              <Crown size={12} />
              {t("palm.pass.badge")}
            </p>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-xs text-muted leading-relaxed">{t("palm.unlock.body")}</p>

        {/* What gets answered is listed before anything is asked of the reader. */}
        <PalmCoverageList title={t("palm.coverage.title")} />

        {!member ? (
          <PassLock feature={t("palm.pass.feature")} need="palm" compact />
        ) : left <= 0 ? (
          <p className="text-xs text-amber-400 text-center" data-testid="palm-pass-used">
            {nextDate ? t("palm.pass.usedOn", { date: nextDate }) : t("palm.pass.used")}
          </p>
        ) : confirming ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-foreground text-center">{t("palm.pass.confirm")}</p>
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
          <div className="flex flex-col gap-2">
            <p className="text-xs text-foreground/85 text-center">{t("palm.pass.included")}</p>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              data-testid="palm-pass-unlock"
              className="w-full rounded-2xl bg-gold text-[#1a0e00] px-4 py-3 text-sm font-bold"
            >
              {t("palm.pass.cta")}
            </button>
          </div>
        )}

        {errorMsg && <p className="text-[11px] text-red-400 text-center">{errorMsg}</p>}
      </div>
    </BottomSheetModal>
  );
}
