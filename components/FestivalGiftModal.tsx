"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Gift, Sparkles } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { usePermissionsPrompt } from "@/providers/permissions-prompt-provider";
import { useTour } from "@/providers/tour-provider";
import { useDismissOnBackPress } from "@/providers/back-handler-provider";
import { useFeature } from "@/hooks/useFeature";
import { useReferralAmounts } from "@/hooks/useReferralAmounts";
import { formatRupees } from "@/lib/format";
import { api } from "@/lib/api";
import { CHAT_PENDING_CONTEXT_KEY, type ChatPendingPayload } from "@/lib/chat-handoff";
import ShareOptionsSheet from "@/components/ShareOptionsSheet";

type Status = "offer" | "claiming" | "claimed" | "error";

/**
 * Generic replacement for the old per-campaign hardcoded modal
 * (TopUpBonusPrompt.tsx + useClaimCampaign.ts) — driven entirely by
 * `user.activeClaimableCampaign`, which the backend computes from either the
 * static CLAIM_CAMPAIGNS array or an admin-created gift_campaigns row. A new
 * festival needs zero frontend changes: it's a form submission in
 * /admin/gift-campaigns, not a new component + layout.tsx mount + deploy.
 */
export default function FestivalGiftModal() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, refresh } = useAuth();
  const { resolved: permissionsResolved } = usePermissionsPrompt();
  const { tourActive, tourPending } = useTour();
  const chatFeature = useFeature("nav.askAI");
  const referralAmounts = useReferralAmounts();

  const [dismissed, setDismissed] = useState(false);
  const [status, setStatus] = useState<Status>("offer");
  const [newBalancePaise, setNewBalancePaise] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const campaign = user?.activeClaimableCampaign ?? null;
  const dismissKey = campaign ? `aroha:festivalGift:${campaign.key}:v1` : null;

  useEffect(() => {
    setDismissed(false);
    if (typeof window === "undefined" || !dismissKey) return;
    if (window.localStorage.getItem(dismissKey)) setDismissed(true);
  }, [dismissKey]);

  // Never render underneath a running tour's scrim — the tour is the one
  // overlay that must finish before any launch-time prompt gets the screen.
  // tourPending covers the gap before tourActive itself flips true (TourHost
  // can poll up to 4s for the tour's target before opening it) — without it a
  // brand-new user sees this modal flash on first paint, then get yanked away
  // the instant the tour actually opens.
  const visible =
    !!campaign &&
    permissionsResolved &&
    !!user?.profileCompletedAt &&
    !dismissed &&
    !tourActive &&
    !tourPending;

  const dismiss = () => {
    if (dismissKey) {
      try {
        window.localStorage.setItem(dismissKey, "1");
      } catch {
        // localStorage unavailable — the modal just reappears next open, same as ShareAppPrompt's fallback.
      }
    }
    setDismissed(true);
  };

  useDismissOnBackPress(visible && status !== "claiming", dismiss);

  const claim = async () => {
    if (!campaign) return;
    setStatus("claiming");
    try {
      const result = await api.claimCampaignBonus(campaign.key);
      await refresh();
      // `claimed: false` means another device won the race — still a success from this
      // screen's POV (the money landed), so it gets the same "claimed" state, not an error.
      setNewBalancePaise(result.walletBalancePaise);
      setStatus("claimed");
    } catch {
      setStatus("error");
    }
  };

  const goToChat = () => {
    const payload: ChatPendingPayload = { message: t("festivalGift.chatPrompt") };
    sessionStorage.setItem(CHAT_PENDING_CONTEXT_KEY, JSON.stringify(payload));
    dismiss();
    router.push("/ai-chat");
  };

  if (!campaign) return null;
  const amount = formatRupees(campaign.amountPaise);

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          >
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", damping: 26 }}
              className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl bg-card border border-gold/20"
            >
              <div className="h-2 bg-gradient-to-r from-yellow-400 to-yellow-600" />

              <div className="p-6 flex flex-col items-center text-center">
                <span className="text-gold mb-3">
                  <Gift size={48} />
                </span>

                {status === "offer" || status === "claiming" ? (
                  <>
                    <p className="text-xs uppercase tracking-wide text-muted mb-1">
                      {t("festivalGift.eyebrow")}
                    </p>
                    <h2 className="text-xl font-display text-foreground mb-2">
                      {t("festivalGift.title", { amount })}
                    </h2>
                    <p className="text-sm text-muted leading-relaxed mb-5">
                      {t("festivalGift.body", { amount, title: campaign.title })}
                    </p>

                    <div className="flex gap-3 w-full">
                      <button
                        onClick={dismiss}
                        disabled={status === "claiming"}
                        className="flex-1 py-3 rounded-xl border border-gold/20 text-foreground text-sm font-medium transition-opacity disabled:opacity-50"
                      >
                        {t("festivalGift.dismiss")}
                      </button>
                      <button
                        onClick={claim}
                        disabled={status === "claiming"}
                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black text-sm font-bold transition-opacity disabled:opacity-70"
                      >
                        {status === "claiming"
                          ? t("festivalGift.claiming")
                          : t("festivalGift.cta", { amount })}
                      </button>
                    </div>
                  </>
                ) : status === "claimed" ? (
                  <>
                    <h2 className="text-xl font-display text-foreground mb-2">
                      {t("festivalGift.claimedTitle", { amount })}
                    </h2>
                    <p className="text-sm text-muted leading-relaxed mb-5">
                      {t("festivalGift.claimedBody", { balance: formatRupees(newBalancePaise) })}
                    </p>
                    <div className="flex flex-col gap-2 w-full">
                      {chatFeature.enabled && (
                        <button
                          onClick={goToChat}
                          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black text-sm font-bold transition-opacity"
                        >
                          <Sparkles size={16} />
                          {t("festivalGift.chatCta")}
                        </button>
                      )}
                      {/* "Want more? Share it" — the referral bonus is the only other way to top up for free.
                          `campaign` is the one that's live right now, so the festive framing always applies here. */}
                      {user?.referralCode && (
                        <button
                          onClick={() => setSheetOpen(true)}
                          className="py-3 rounded-xl border border-gold/20 text-foreground text-sm font-medium transition-opacity"
                        >
                          {t("sharePrompt.title", {
                            ...referralAmounts,
                            context: "festival",
                            festival: campaign.title,
                          })}
                        </button>
                      )}
                      <button onClick={dismiss} className="py-2 text-sm text-muted">
                        {t("common.close")}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted leading-relaxed mb-5">
                      {t("festivalGift.error")}
                    </p>
                    <button
                      onClick={claim}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black text-sm font-bold transition-opacity"
                    >
                      {t("festivalGift.retry")}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {user?.referralCode && (
        <ShareOptionsSheet open={sheetOpen} onClose={() => setSheetOpen(false)} code={user.referralCode} />
      )}
    </>
  );
}
