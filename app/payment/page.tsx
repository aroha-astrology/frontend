"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Check, ExternalLink, Loader2, Sparkles, Wallet } from "lucide-react";
import ParticleBackground from "@/components/ParticleBackground";
import IconButton from "@/components/ui/IconButton";
import Card from "@/components/ui/Card";
import { useAuth } from "@/providers/auth-provider";
import { formatRupees } from "@/lib/format";
import WalletBalance from "@/components/ui/WalletBalance";
import PassSummaryCard from "@/components/pass/PassSummaryCard";
import { api, ApiError, type TopUpAmount } from "@/lib/api";
import { track } from "@/lib/analytics";
import { isNativeAndroid, isNativeIOS } from "@/lib/play-billing";
import { maybeRequestReview, PLAY_STORE_URL } from "@/lib/app-review";

function TopUpCard({
  amount,
  selected,
  onSelect,
}: {
  amount: TopUpAmount;
  selected: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  return (
    <button
      onClick={onSelect}
      className={`relative w-full text-left p-4 rounded-2xl border transition-all ${
        selected
          ? "border-gold bg-gold/10 shadow-[0_0_20px_rgba(223,181,100,0.15)]"
          : "border-gold/15 bg-surface/40 hover:border-gold/35"
      }`}
    >
      {amount.popular && (
        <span className="absolute -top-2.5 right-3 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gold text-[#1a0e00]">
          {t("payment.popular")}
        </span>
      )}
      <div className="flex items-center gap-1.5">
        <Sparkles size={14} className="text-gold" />
        <span className="text-lg font-bold text-gold">{formatRupees(amount.amountPaise)}</span>
      </div>
    </button>
  );
}

export default function PaymentPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, refresh: refreshUser } = useAuth();

  const [amounts, setAmounts] = useState<TopUpAmount[]>([]);
  const [packsLoading, setPacksLoading] = useState(true);
  const [selectedAmountId, setSelectedAmountId] = useState<string | null>(null);

  const [playAvailable, setPlayAvailable] = useState(false);
  const [iosNative, setIosNative] = useState(false);

  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ walletBalancePaise: number } | null>(null);

  useEffect(() => {
    api
      .billingTopUpAmounts()
      .then(({ amounts }) => {
        setAmounts(amounts);
        setSelectedAmountId((prev) => prev ?? amounts.find((p) => p.popular)?.id ?? amounts[0]?.id ?? null);
      })
      .catch(() => setAmounts([]))
      .finally(() => setPacksLoading(false));
  }, []);

  // Google Play Billing is the only way to add money (Razorpay was removed on
  // 2026-09-24), and it only exists inside the native Android build. The web
  // app points people at the Android app; the iOS build gets a plain notice,
  // since Apple's rules don't allow sending iPhone users elsewhere to pay.
  useEffect(() => {
    Promise.all([isNativeAndroid(), isNativeIOS()]).then(([android, ios]) => {
      setPlayAvailable(android);
      setIosNative(ios);
    });
  }, []);

  // A completed top-up is the clearest "this app was worth paying for" moment we
  // get, so it's one of the milestones that offers Google's review card.
  useEffect(() => {
    if (success) void maybeRequestReview();
  }, [success]);

  const selectedAmount = amounts.find((p) => p.id === selectedAmountId) ?? null;

  function selectAmount(id: string) {
    setSelectedAmountId(id);
    setPayError(null);
  }

  async function handlePay() {
    if (!selectedAmount) return;
    setPaying(true);
    setPayError(null);
    track("topup_started", { amountPaise: selectedAmount.amountPaise, method: "google_play" });
    try {
      await api.checkout(selectedAmount.id);
      const { PlayBilling } = await import("@/lib/play-billing");
      const purchase = await PlayBilling.purchaseProduct({
        productId: selectedAmount.id,
        userId: user?.id,
      });
      await api.confirmGooglePlayOrder({
        purchaseToken: purchase.purchaseToken,
        productId: purchase.productId,
      });

      await refreshUser();
      track("topup_succeeded", { amountPaise: selectedAmount.amountPaise, method: "google_play" });
      setSuccess({ walletBalancePaise: selectedAmount.amountPaise });
    } catch (err) {
      const isUserCancelled =
        err !== null && typeof err === "object" && "code" in err && (err as { code?: string }).code === "1";
      if (isUserCancelled) {
        // User backed out of the Play purchase sheet — not an error, nothing to show.
      } else if (err instanceof ApiError) {
        setPayError(err.status === 403 ? t("payment.notLiveYet") : t("payment.genericError"));
      } else {
        setPayError(t("payment.genericError"));
      }
    } finally {
      setPaying(false);
    }
  }

  return (
    <main className="cosmic-bg min-h-screen pb-tab-safe relative overflow-hidden text-foreground">
      <ParticleBackground />

      <div className="relative z-10 px-5 pt-8 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <IconButton onClick={() => router.back()} aria-label={t("common.back")}>
            <ArrowLeft size={18} />
          </IconButton>
          <h1 className="text-lg font-display text-foreground flex-1">{t("payment.title")}</h1>
        </div>

        {/* Current balance */}
        <Card className="p-4 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet size={16} className="text-gold" />
            <span className="text-xs text-muted">{t("payment.currentBalance")}</span>
          </div>
          <WalletBalance paise={user?.walletBalancePaise ?? 0} size="md" />
        </Card>

        {/* The Aroha Pass — a Google Play subscription, never paid from this wallet. */}
        <PassSummaryCard className="mb-6" />

        {success ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center py-10"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-4">
              <Check size={30} className="text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold font-display text-foreground mb-2">
              {t("payment.successTitle")}
            </h2>
            <p className="text-sm text-muted mb-8">
              {t("payment.successBody", { amount: formatRupees(success.walletBalancePaise) })}
            </p>
            <button
              onClick={() => router.back()}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold"
            >
              {t("payment.done")}
            </button>
          </motion.div>
        ) : (
          <>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted mb-3">
              {t("payment.selectPack")}
            </p>

            {packsLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 size={24} className="animate-spin text-gold" />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 mb-6">
                {amounts.map((amount) => (
                  <TopUpCard
                    key={amount.id}
                    amount={amount}
                    selected={amount.id === selectedAmountId}
                    onSelect={() => selectAmount(amount.id)}
                  />
                ))}
              </div>
            )}

            {selectedAmount && playAvailable && (
              <Card className="p-4 mb-4">
                <div className="flex justify-between text-sm font-bold text-foreground">
                  <span>{t("payment.total")}</span>
                  <span className="text-gold">{formatRupees(selectedAmount.amountPaise)}</span>
                </div>
              </Card>
            )}

            {!playAvailable && !packsLoading && (
              <Card className="p-4 mb-4 text-center">
                <p className="text-sm text-foreground leading-relaxed">
                  {t(iosNative ? "payment.iosComingSoon" : "payment.androidOnly")}
                </p>
                {!iosNative && (
                  <a
                    href={PLAY_STORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-gold"
                  >
                    {t("payment.getAndroidApp")}
                    <ExternalLink size={14} />
                  </a>
                )}
              </Card>
            )}

            {payError && (
              <p className="text-xs text-red-400 text-center mb-3">{payError}</p>
            )}

            <button
              onClick={handlePay}
              disabled={!selectedAmount || paying || !playAvailable}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
            >
              {paying ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {t("payment.processing")}
                </>
              ) : (
                selectedAmount &&
                t("payment.payButton", { amount: formatRupees(selectedAmount.amountPaise).replace("₹", "") })
              )}
            </button>

            <p className="text-[10px] text-muted text-center mt-3 px-4 leading-relaxed">
              {t("payment.gatewayNote")}
            </p>
          </>
        )}
      </div>
    </main>
  );
}
