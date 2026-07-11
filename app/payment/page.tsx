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
import { api, type CreditPack, type CouponValidation } from "@/lib/api";

function formatRupees(paise: number): string {
  const rupees = paise / 100;
  return `₹${Number.isInteger(rupees) ? rupees : rupees.toFixed(2)}`;
}

function PackCard({
  pack,
  selected,
  onSelect,
}: {
  pack: CreditPack;
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
      {pack.popular && (
        <span className="absolute -top-2.5 right-3 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gold text-[#1a0e00]">
          {t("payment.popular")}
        </span>
      )}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-gold" />
            <span className="text-base font-bold font-display text-foreground">
              {pack.credits} {t("payment.creditsUnit")}
            </span>
          </div>
          <p className="text-xs text-muted mt-1">{pack.label}</p>
        </div>
        <span className="text-lg font-bold text-gold">{formatRupees(pack.priceInPaise)}</span>
      </div>
    </button>
  );
}

export default function PaymentPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, refresh: refreshUser } = useAuth();

  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [packsLoading, setPacksLoading] = useState(true);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);

  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState<CouponValidation | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ credits: number } | null>(null);

  useEffect(() => {
    api
      .billingPacks()
      .then(({ packs }) => {
        setPacks(packs);
        setSelectedPackId((prev) => prev ?? packs.find((p) => p.popular)?.id ?? packs[0]?.id ?? null);
      })
      .catch(() => setPacks([]))
      .finally(() => setPacksLoading(false));
  }, []);

  const selectedPack = packs.find((p) => p.id === selectedPackId) ?? null;
  const couponApplied = couponResult?.valid === true;
  const discountPaise = couponApplied ? couponResult?.discountPaise ?? 0 : 0;
  const finalPaise = couponApplied
    ? couponResult?.finalAmountPaise ?? selectedPack?.priceInPaise ?? 0
    : selectedPack?.priceInPaise ?? 0;

  function selectPack(id: string) {
    setSelectedPackId(id);
    setCouponCode("");
    setCouponResult(null);
    setPayError(null);
  }

  async function handleApplyCoupon() {
    if (!selectedPack || !couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const result = await api.validateCoupon(couponCode.trim(), selectedPack.id);
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
    if (!selectedPack) return;
    setPaying(true);
    setPayError(null);
    try {
      const order = await api.checkout(selectedPack.id, couponApplied ? couponResult?.code : undefined);
      await api.confirmOrder(order.id);
      await refreshUser();
      setSuccess({ credits: selectedPack.credits });
    } catch {
      setPayError(t("payment.genericError"));
    } finally {
      setPaying(false);
    }
  }

  return (
    <main className="cosmic-bg min-h-screen pb-28 relative overflow-hidden text-foreground">
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
          <span className="text-lg font-bold text-gold">
            {user?.credits ?? 0} {t("payment.creditsUnit")}
          </span>
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
              {t("payment.successBody", { credits: success.credits })}
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
                {packs.map((pack) => (
                  <PackCard
                    key={pack.id}
                    pack={pack}
                    selected={pack.id === selectedPackId}
                    onSelect={() => selectPack(pack.id)}
                  />
                ))}
              </div>
            )}

            {selectedPack && (
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
                    <span>{formatRupees(selectedPack.priceInPaise)}</span>
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

            {payError && (
              <p className="text-xs text-red-400 text-center mb-3">{payError}</p>
            )}

            <button
              onClick={handlePay}
              disabled={!selectedPack || paying}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
            >
              {paying ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {t("payment.processing")}
                </>
              ) : (
                selectedPack && t("payment.payButton", { amount: formatRupees(finalPaise).replace("₹", "") })
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
