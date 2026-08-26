"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Gift } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { usePermissionsPrompt } from "@/providers/permissions-prompt-provider";
import { useTour } from "@/providers/tour-provider";
import { useDismissOnBackPress } from "@/providers/back-handler-provider";
import { useFeature } from "@/hooks/useFeature";
import { api } from "@/lib/api";
import DailyRewardLadder from "@/components/rewards/DailyRewardLadder";

/**
 * Once-a-day popup showing the full 7-day ladder, so a user who keeps coming
 * back can see what's waiting for them — same overlay/dismiss pattern as
 * FestivalGiftModal, but its own daily (not per-campaign) dismiss key and its
 * own data source (GET /v1/rewards/daily, not user.activeClaimableCampaign).
 * A live festival gift takes the popup slot instead — the two must never
 * stack, so this waits for that to be absent.
 */
export default function DailyRewardModal() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { resolved: permissionsResolved } = usePermissionsPrompt();
  const { tourActive } = useTour();
  const { enabled: rewardsEnabled } = useFeature("nav.rewards");

  const [dismissed, setDismissed] = useState(false);
  const [claimedToday, setClaimedToday] = useState<boolean | null>(null);

  // Client-local calendar date — an approximation of the server's IST day, good
  // enough for a "don't nag twice today" guard (the server's own idempotency on
  // claim is the real source of truth, see rewards.service.ts).
  const todayKey = `aroha:dailyReward:${new Date().toISOString().slice(0, 10)}`;

  const eligible =
    rewardsEnabled && permissionsResolved && !!user?.profileCompletedAt && !user?.activeClaimableCampaign;

  useEffect(() => {
    setDismissed(false);
    setClaimedToday(null);
    if (!eligible) return;
    if (typeof window !== "undefined" && window.localStorage.getItem(todayKey)) {
      setDismissed(true);
      return;
    }
    api
      .getDailyReward()
      .then((state) => setClaimedToday(state.claimedToday))
      .catch(() => setClaimedToday(true)); // fail closed — don't nag on an error
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligible, todayKey]);

  // Never render underneath a running tour's scrim — the tour is the one
  // overlay that must finish before any launch-time prompt gets the screen.
  const visible = eligible && !dismissed && claimedToday === false && !tourActive;

  const dismiss = () => {
    try {
      window.localStorage.setItem(todayKey, "1");
    } catch {
      // localStorage unavailable — the popup just reappears next open, same as FestivalGiftModal's fallback.
    }
    setDismissed(true);
  };

  useDismissOnBackPress(visible, dismiss);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[89] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 26 }}
            className="w-full max-w-sm"
          >
            <div className="flex items-center justify-center gap-2 mb-3 text-gold">
              <Gift size={22} />
              <span className="text-sm font-display">{t("rewards.eyebrow")}</span>
            </div>

            <DailyRewardLadder />

            <button
              type="button"
              onClick={dismiss}
              className="w-full py-2.5 mt-3 text-sm text-muted"
            >
              {t("rewards.dismiss")}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
