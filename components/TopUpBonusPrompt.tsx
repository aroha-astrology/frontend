"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Gift, Sparkles } from "lucide-react";
import { useClaimCampaign } from "@/hooks/useClaimCampaign";
import { useFeature } from "@/hooks/useFeature";
import { useReferralAmounts } from "@/hooks/useReferralAmounts";
import { useAuth } from "@/providers/auth-provider";
import { formatRupees } from "@/lib/format";
import { CHAT_PENDING_CONTEXT_KEY, type ChatPendingPayload } from "@/lib/chat-handoff";
import ShareOptionsSheet from "@/components/ShareOptionsSheet";

const CAMPAIGN_KEY = "top_up_bonus_2026_08_16";
const FEATURE_KEY = "referral.topUpBonus";
const IST_DATE = "2026-08-16";
const FALLBACK_PAISE = 10000;
/** Offered only to wallets under ₹100 — same ceiling the server re-checks at claim time. */
const MAX_BALANCE_PAISE = 10000;
const DISMISS_KEY = "aroha:topUpBonus20260816:v1";

/** One-time ₹100 "wallet running low" claim modal — shown once per device, on IST_DATE only. */
export default function TopUpBonusPrompt() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const chatFeature = useFeature("nav.askAI");
  const referralAmounts = useReferralAmounts();
  const [sheetOpen, setSheetOpen] = useState(false);
  const { visible, status, amountPaise, newBalancePaise, dismiss, claim } = useClaimCampaign({
    campaignKey: CAMPAIGN_KEY,
    featureKey: FEATURE_KEY,
    istDate: IST_DATE,
    fallbackPaise: FALLBACK_PAISE,
    dismissKey: DISMISS_KEY,
    maxBalancePaise: MAX_BALANCE_PAISE,
  });

  const amount = formatRupees(amountPaise);

  const goToChat = () => {
    const payload: ChatPendingPayload = { message: t("topUpBonus.chatPrompt") };
    sessionStorage.setItem(CHAT_PENDING_CONTEXT_KEY, JSON.stringify(payload));
    dismiss();
    router.push("/ai-chat");
  };

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
                      {t("topUpBonus.eyebrow")}
                    </p>
                    <h2 className="text-xl font-display text-foreground mb-2">
                      {t("topUpBonus.title", { amount })}
                    </h2>
                    <p className="text-sm text-muted leading-relaxed mb-5">
                      {t("topUpBonus.body", { amount })}
                    </p>

                    <div className="flex gap-3 w-full">
                      <button
                        onClick={dismiss}
                        disabled={status === "claiming"}
                        className="flex-1 py-3 rounded-xl border border-gold/20 text-foreground text-sm font-medium transition-opacity disabled:opacity-50"
                      >
                        {t("topUpBonus.dismiss")}
                      </button>
                      <button
                        onClick={claim}
                        disabled={status === "claiming"}
                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black text-sm font-bold transition-opacity disabled:opacity-70"
                      >
                        {status === "claiming"
                          ? t("topUpBonus.claiming")
                          : t("topUpBonus.cta", { amount })}
                      </button>
                    </div>
                  </>
                ) : status === "claimed" ? (
                  <>
                    <h2 className="text-xl font-display text-foreground mb-2">
                      {t("topUpBonus.claimedTitle", { amount })}
                    </h2>
                    <p className="text-sm text-muted leading-relaxed mb-5">
                      {t("topUpBonus.claimedBody", { balance: formatRupees(newBalancePaise) })}
                    </p>
                    <div className="flex flex-col gap-2 w-full">
                      {chatFeature.enabled && (
                        <button
                          onClick={goToChat}
                          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black text-sm font-bold transition-opacity"
                        >
                          <Sparkles size={16} />
                          {t("topUpBonus.chatCta")}
                        </button>
                      )}
                      {/* "Want more? Share it" — the referral bonus is the only other way to top up for free. */}
                      {user?.referralCode && (
                        <button
                          onClick={() => setSheetOpen(true)}
                          className="py-3 rounded-xl border border-gold/20 text-foreground text-sm font-medium transition-opacity"
                        >
                          {t("sharePrompt.title", referralAmounts)}
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
                      {t("topUpBonus.error")}
                    </p>
                    <button
                      onClick={claim}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black text-sm font-bold transition-opacity"
                    >
                      {t("topUpBonus.retry")}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {user?.referralCode && (
        <ShareOptionsSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          code={user.referralCode}
        />
      )}
    </>
  );
}
