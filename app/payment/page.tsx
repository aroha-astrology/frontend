"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Check, Loader2, Sparkles, Tag, Wallet, X } from "lucide-react";
import ParticleBackground from "@/components/ParticleBackground";
import IconButton from "@/components/ui/IconButton";
import Card from "@/components/ui/Card";
import { useAuth } from "@/providers/auth-provider";
import { formatRupees } from "@/lib/format";
import WalletBalance from "@/components/ui/WalletBalance";
import { api, ApiError, type TopUpAmount, type CouponValidation } from "@/lib/api";
import { isNativeAndroid } from "@/lib/play-billing";

type PaymentMethod = "google_play" | "razorpay";

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

  const [razorpayEnabled, setRazorpayEnabled] = useState(false);
  const [playAvailable, setPlayAvailable] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("razorpay");

  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState<CouponValidation | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ walletBalancePaise: number } | null>(null);

  useEffect(() => {
    api
      .billingTopUpAmounts()
      .then(({ amounts, razorpayEnabled }) => {
        setAmounts(amounts);
        setRazorpayEnabled(razorpayEnabled);
        setSelectedAmountId((prev) => prev ?? amounts.find((p) => p.popular)?.id ?? amounts[0]?.id ?? null);
      })
      .catch(() => setAmounts([]))
      .finally(() => setPacksLoading(false));
  }, []);

  // Google Play billing only exists inside the native Android build; on the
  // web (and iOS) Razorpay is the only way to pay.
  useEffect(() => {
    isNativeAndroid().then((native) => {
      setPlayAvailable(native);
      if (native) setMethod("google_play");
    });
  }, []);

  const selectedAmount = amounts.find((p) => p.id === selectedAmountId) ?? null;
  const couponApplied = couponResult?.valid === true;
  const discountPaise = couponApplied ? couponResult?.discountPaise ?? 0 : 0;
  const finalPaise = couponApplied
    ? couponResult?.finalAmountPaise ?? selectedAmount?.amountPaise ?? 0
    : selectedAmount?.amountPaise ?? 0;

  function selectAmount(id: string) {
    setSelectedAmountId(id);
    setCouponCode("");
    setCouponResult(null);
    setPayError(null);
  }

  async function handleApplyCoupon() {
    if (!selectedAmount || !couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const result = await api.validateCoupon(couponCode.trim(), selectedAmount.id);
      setCouponResult(result);
    } catch {
      setCouponResult({ valid: false, code: couponCode.trim() });
    } finally {
      setCouponLoading(false);
    }
  }

  function clearCoupon() {
    setCouponCode("");
    setCouponResult(null);
  }

  async function handlePay() {
    if (!selectedAmount) return;
    const code = couponApplied ? couponResult?.code : undefined;
    setPaying(true);
    setPayError(null);
    try {
      if (method === "google_play") {
        await api.checkout(selectedAmount.id, code);
        const { PlayBilling } = await import("@/lib/play-billing");
        const purchase = await PlayBilling.purchaseProduct({ productId: selectedAmount.id });
        await api.confirmGooglePlayOrder({
          purchaseToken: purchase.purchaseToken,
          productId: purchase.productId,
        });
      } else {
        const { order, razorpayOrderId, razorpayKeyId } = await api.razorpayCheckout(
          selectedAmount.id,
          code,
        );
        const { payWithRazorpay } = await import("@/lib/razorpay");
        const result = await payWithRazorpay({
          keyId: razorpayKeyId,
          razorpayOrderId,
          amountPaise: order.finalAmountPaise,
          currency: order.currency,
          name: "Aroha Astrology",
          description: t("payment.rechargeDescription"),
          prefill: {
            ...(user?.displayName ? { name: user.displayName } : {}),
            // Razorpay's contact field already renders a +91 selector, so the
            // E.164 form lands in it as a duplicated country code and the
            // field comes back blank — which puts its "Contact details" gate
            // in front of the payment methods (UPI included) for every user.
            ...(user?.phoneE164 ? { contact: user.phoneE164.replace(/^\+91/, "") } : {}),
            ...(user?.email ? { email: user.email } : {}),
          },
        });
        // User closed the modal without paying — nothing happened, no error.
        if (!result) return;
        await api.verifyRazorpayPayment({
          orderId: order.id,
          razorpayOrderId: result.razorpay_order_id,
          razorpayPaymentId: result.razorpay_payment_id,
          razorpaySignature: result.razorpay_signature,
        });
      }

      await refreshUser();
      setSuccess({ walletBalancePaise: selectedAmount.amountPaise });
    } catch (err) {
      const isUserCancelled =
        err !== null && typeof err === "object" && "code" in err && (err as { code?: string }).code === "1";
      if (isUserCancelled) {
        // User backed out of the Play purchase sheet — not an error, nothing to show.
      } else if (err instanceof ApiError) {
        setPayError(err.status === 403 ? t("payment.notLiveYet") : t("payment.genericError"));
      } else {
        // Razorpay's own payment.failed carries a reason worth showing verbatim.
        setPayError(err instanceof Error ? err.message : t("payment.genericError"));
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

            {selectedAmount && (
              <Card className="p-4 mb-4">
                {/* Coupon */}
                <div className="mb-4">
                  <label className="text-[11px] text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Tag size={12} className="text-gold" />
                    {t("payment.couponLabel")}
                  </label>
                  {couponApplied ? (
                    <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
                      <span className="text-sm font-semibold text-emerald-300">
                        {couponResult?.code} {t("payment.couponApplied")}
                      </span>
                      <button onClick={clearCoupon} aria-label={t("payment.removeCoupon")}>
                        <X size={16} className="text-emerald-300" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder={t("payment.couponPlaceholder")}
                        className="flex-1 min-w-0 h-11 rounded-xl px-3.5 outline-none border text-sm focus:border-gold/60 transition-colors bg-surface border-border text-foreground uppercase placeholder:normal-case"
                      />
                      <button
                        onClick={handleApplyCoupon}
                        disabled={!couponCode.trim() || couponLoading}
                        className="shrink-0 whitespace-nowrap px-4 rounded-xl border border-gold/40 text-gold text-xs font-semibold disabled:opacity-40 transition-opacity flex items-center gap-1.5"
                      >
                        {couponLoading ? <Loader2 size={14} className="animate-spin" /> : t("payment.apply")}
                      </button>
                    </div>
                  )}
                  {couponResult && !couponResult.valid && (
                    <p className="text-xs text-red-400 mt-2">{t("payment.couponInvalid")}</p>
                  )}
                </div>

                {/* Order summary */}
                <div className="border-t border-gold/10 pt-3 space-y-1.5">
                  <div className="flex justify-between text-xs text-muted">
                    <span>{t("payment.packPrice")}</span>
                    <span>{formatRupees(selectedAmount.amountPaise)}</span>
                  </div>
                  {discountPaise > 0 && (
                    <div className="flex justify-between text-xs text-emerald-400">
                      <span>{t("payment.discount")}</span>
                      <span>-{formatRupees(discountPaise)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-foreground pt-1">
                    <span>{t("payment.total")}</span>
                    <span className="text-gold">{formatRupees(finalPaise)}</span>
                  </div>
                </div>
              </Card>
            )}

            {/* Only a choice when both rails are actually usable here. */}
            {playAvailable && razorpayEnabled && (
              <div className="mb-4">
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted mb-2">
                  {t("payment.methodLabel")}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {(["google_play", "razorpay"] as const).map((option) => (
                    <button
                      key={option}
                      onClick={() => setMethod(option)}
                      className={`rounded-2xl border p-3 text-left transition-all ${
                        method === option
                          ? "border-gold bg-gold/10"
                          : "border-gold/15 bg-surface/40 hover:border-gold/35"
                      }`}
                    >
                      <span className="block text-sm font-semibold text-foreground">
                        {t(option === "google_play" ? "payment.methodPlay" : "payment.methodRazorpay")}
                      </span>
                      <span className="block text-[10px] text-muted mt-0.5">
                        {t(
                          option === "google_play"
                            ? "payment.methodPlayHint"
                            : "payment.methodRazorpayHint",
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {payError && (
              <p className="text-xs text-red-400 text-center mb-3">{payError}</p>
            )}

            <button
              onClick={handlePay}
              disabled={!selectedAmount || paying}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
            >
              {paying ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {t("payment.processing")}
                </>
              ) : (
                selectedAmount && t("payment.payButton", { amount: formatRupees(finalPaise).replace("₹", "") })
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
