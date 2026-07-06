"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Car, Home, Building2, Package } from "lucide-react";
import { api, ApiError, type PurchasePlanCategory } from "@/lib/api";
import Card from "@/components/ui/Card";

interface PurchasePlanModalProps {
  isOpen: boolean;
  panchangDate: string;
  onClose: () => void;
  onSubmitted: (planId: string) => void;
}

/** Cost-bracket ids sent to the backend; display labels are localized via i18n (see COST_BRACKET_LABEL_KEYS). */
const COST_BRACKETS = ["under-1l", "1l-5l", "5l-10l", "10l-25l", "25l-50l", "50l-1cr", "above-1cr"] as const;

const COST_BRACKET_LABEL_KEYS: Record<(typeof COST_BRACKETS)[number], string> = {
  "under-1l": "purchasePlan.costBracketUnder1L",
  "1l-5l": "purchasePlan.costBracket1L5L",
  "5l-10l": "purchasePlan.costBracket5L10L",
  "10l-25l": "purchasePlan.costBracket10L25L",
  "25l-50l": "purchasePlan.costBracket25L50L",
  "50l-1cr": "purchasePlan.costBracket50L1Cr",
  "above-1cr": "purchasePlan.costBracketAbove1Cr",
};

export default function PurchasePlanModal({ isOpen, panchangDate, onClose, onSubmitted }: PurchasePlanModalProps) {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState<"pick-category" | "form" | "submitted">("pick-category");
  const [category, setCategory] = useState<PurchasePlanCategory | null>(null);
  const [detail, setDetail] = useState("");
  const [costBracket, setCostBracket] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const CATEGORIES: { id: PurchasePlanCategory; icon: React.ReactNode; label: string; sub: string }[] = [
    {
      id: "vehicle",
      icon: <Car size={22} />,
      label: t("horoscope.panchang.categoryVehicle"),
      sub: t("horoscope.panchang.categoryVehicleSub"),
    },
    {
      id: "home",
      icon: <Home size={22} />,
      label: t("horoscope.panchang.categoryHome"),
      sub: t("horoscope.panchang.categoryHomeSub"),
    },
    {
      id: "commercial",
      icon: <Building2 size={22} />,
      label: t("horoscope.panchang.categoryCommercial"),
      sub: t("horoscope.panchang.categoryCommercialSub"),
    },
    {
      id: "other",
      icon: <Package size={22} />,
      label: t("horoscope.panchang.categoryOther"),
      sub: t("horoscope.panchang.categoryOtherSub"),
    },
  ];

  function reset() {
    setStep("pick-category");
    setCategory(null);
    setDetail("");
    setCostBracket("");
    setBookingDate("");
    setDeliveryDate("");
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function pickCategory(c: PurchasePlanCategory) {
    setCategory(c);
    setStep("form");
  }

  async function handleSubmit() {
    if (!category) return;
    if (!bookingDate && !deliveryDate) {
      setError(t("purchasePlan.atLeastOneDateRequired"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.purchasePlanAnalyze({
        category,
        metadata: detail ? { detail } : {},
        costBracket: costBracket || undefined,
        bookingDate: bookingDate || undefined,
        deliveryDate: deliveryDate || undefined,
        panchangDate,
        language: i18n.language,
      });
      setStep("submitted");
      onSubmitted(res.planId);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setError(t("purchasePlan.rateLimitReached"));
      } else {
        setError(t("purchasePlan.error"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
      <Card className="w-full sm:max-w-md max-h-[85vh] overflow-y-auto p-5 rounded-t-3xl sm:rounded-3xl border-gold/20">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-display text-foreground">{t("horoscope.panchang.planningToBuyTitle")}</p>
          <button onClick={handleClose} className="p-1 text-muted hover:text-foreground" aria-label={t("purchasePlan.close")}>
            <X size={18} />
          </button>
        </div>

        {step === "pick-category" && (
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => pickCategory(c.id)}
                className="p-4 rounded-2xl border border-gold/15 bg-surface/40 text-center hover:border-gold/40 transition-colors"
              >
                <span className="text-gold flex justify-center mb-2">{c.icon}</span>
                <p className="text-xs font-semibold text-foreground">{c.label}</p>
                <p className="text-[10px] text-muted mt-0.5">{c.sub}</p>
              </button>
            ))}
          </div>
        )}

        {step === "form" && category && (
          <div className="space-y-3">
            <p className="text-xs text-muted">{t("purchasePlan.selectCategory")}</p>
            <input
              type="text"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder={t("purchasePlan.describeOther")}
              className="w-full rounded-xl border border-gold/20 bg-surface/40 px-3 py-2 text-sm text-foreground placeholder:text-muted"
            />
            <select
              value={costBracket}
              onChange={(e) => setCostBracket(e.target.value)}
              className="w-full rounded-xl border border-gold/20 bg-surface/40 px-3 py-2 text-sm text-foreground"
            >
              <option value="">{t("purchasePlan.costBracket")}</option>
              {COST_BRACKETS.map((b) => (
                <option key={b} value={b}>
                  {t(COST_BRACKET_LABEL_KEYS[b])}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-muted uppercase tracking-wider">{t("purchasePlan.bookingDate")}</label>
                <input
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full mt-1 rounded-xl border border-gold/20 bg-surface/40 px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted uppercase tracking-wider">{t("purchasePlan.deliveryDate")}</label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full mt-1 rounded-xl border border-gold/20 bg-surface/40 px-3 py-2 text-sm text-foreground"
                />
              </div>
            </div>
            <p className="text-[10px] text-muted">{t("purchasePlan.dateHint")}</p>
            {error && <p className="text-[11px] text-red-400">{error}</p>}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-gold text-[#1a0e00] text-sm font-semibold disabled:opacity-50"
            >
              {submitting ? t("purchasePlan.submitting") : t("purchasePlan.submit")}
            </button>
          </div>
        )}

        {step === "submitted" && (
          <div className="text-center py-6">
            <p className="text-sm text-foreground font-semibold mb-1">{t("purchasePlan.analyzing")}</p>
            <p className="text-[11px] text-muted">{t("purchasePlan.yourAnalyses")}</p>
            <button onClick={handleClose} className="mt-4 px-4 py-2 rounded-xl border border-gold/20 text-xs text-foreground">
              {t("purchasePlan.close")}
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
