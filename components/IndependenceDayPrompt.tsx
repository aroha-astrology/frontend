"use client";

import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { useClaimCampaign } from "@/hooks/useClaimCampaign";
import { useFeature } from "@/hooks/useFeature";
import { formatRupees } from "@/lib/format";
import { CHAT_PENDING_CONTEXT_KEY, type ChatPendingPayload } from "@/lib/chat-handoff";
import AshokaChakra from "@/components/ui/AshokaChakra";

const CAMPAIGN_KEY = "independence_day_2026";
const FEATURE_KEY = "referral.independenceBonus";
const IST_DATE = "2026-08-15";
const FALLBACK_PAISE = 50000;
const DISMISS_KEY = "aroha:independenceDay2026:v1";

/** One-time Independence Day 2026 ₹500 claim modal — shown once per device, 15 Aug IST only. */
export default function IndependenceDayPrompt() {
  const { t } = useTranslation();
  const router = useRouter();
  const chatFeature = useFeature("nav.askAI");
  const { visible, status, amountPaise, newBalancePaise, dismiss, claim } = useClaimCampaign({
    campaignKey: CAMPAIGN_KEY,
    featureKey: FEATURE_KEY,
    istDate: IST_DATE,
    fallbackPaise: FALLBACK_PAISE,
    dismissKey: DISMISS_KEY,
  });

  const amount = formatRupees(amountPaise);

  const goToChat = () => {
    const payload: ChatPendingPayload = { message: t("independenceDay.chatPrompt") };
    sessionStorage.setItem(CHAT_PENDING_CONTEXT_KEY, JSON.stringify(payload));
    dismiss();
    router.push("/ai-chat");
  };

  return (
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
            {/* Tricolor band — own contrasting container so the white stripe never sits directly on a light-mode card. */}
            <div className="h-2 flex">
              <div className="flex-1 bg-[#FF9933]" />
              <div className="flex-1 bg-white" />
              <div className="flex-1 bg-[#138808]" />
            </div>

            <div className="p-6 flex flex-col items-center text-center">
              <AshokaChakra size={56} className="mb-3" />

              {status === "offer" || status === "claiming" ? (
                <>
                  <p className="text-xs uppercase tracking-wide text-muted mb-1">
                    {t("independenceDay.eyebrow")}
                  </p>
                  <h2 className="text-xl font-display text-foreground mb-2">
                    {t("independenceDay.title")}
                  </h2>
                  <p className="text-sm text-muted leading-relaxed mb-5">
                    {t("independenceDay.body", { amount })}
                  </p>

                  <div className="flex gap-3 w-full">
                    <button
                      onClick={dismiss}
                      disabled={status === "claiming"}
                      className="flex-1 py-3 rounded-xl border border-gold/20 text-foreground text-sm font-medium transition-opacity disabled:opacity-50"
                    >
                      {t("independenceDay.dismiss")}
                    </button>
                    <button
                      onClick={claim}
                      disabled={status === "claiming"}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#FF9933] to-[#138808] text-white text-sm font-bold transition-opacity disabled:opacity-70"
                    >
                      {status === "claiming"
                        ? t("independenceDay.claiming")
                        : t("independenceDay.cta", { amount })}
                    </button>
                  </div>
                </>
              ) : status === "claimed" ? (
                <>
                  <h2 className="text-xl font-display text-foreground mb-2">
                    {t("independenceDay.claimedTitle", { amount })}
                  </h2>
                  <p className="text-sm text-muted leading-relaxed mb-5">
                    {t("independenceDay.claimedBody", { balance: formatRupees(newBalancePaise) })}
                  </p>
                  <div className="flex flex-col gap-2 w-full">
                    {chatFeature.enabled && (
                      <button
                        onClick={goToChat}
                        className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#FF9933] to-[#138808] text-white text-sm font-bold transition-opacity"
                      >
                        <Sparkles size={16} />
                        {t("independenceDay.chatCta")}
                      </button>
                    )}
                    <button
                      onClick={dismiss}
                      className="py-2 text-sm text-muted"
                    >
                      {t("common.close")}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted leading-relaxed mb-5">
                    {t("independenceDay.error")}
                  </p>
                  <button
                    onClick={claim}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FF9933] to-[#138808] text-white text-sm font-bold transition-opacity"
                  >
                    {t("independenceDay.retry")}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
