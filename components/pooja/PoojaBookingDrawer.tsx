"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/providers/auth-provider";
import { api, ApiError, type PoojaCatalogItem, type PoojaBooking } from "@/lib/api";
import { formatRupees } from "@/lib/format";

const ADDRESS_MAX = 500;
const NOTES_MAX = 1000;
const PINCODE_RE = /^\d{6}$/;

/** Local YYYY-MM-DD for today, using the browser's local calendar date (not UTC) so the `min` on the native date input doesn't shift a day early/late around midnight. */
function todayDateInputValue(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export interface PoojaBookingDrawerProps {
  pooja: PoojaCatalogItem;
  isOpen: boolean;
  onClose: () => void;
  onBooked: (booking: PoojaBooking) => void;
}

/**
 * Bottom-sheet booking form, shape-copy of `AstrologerBookingDrawer.tsx`
 * (itself a copy of `HouseUnlockDrawer.tsx`): cost baked into the CTA label,
 * insufficient-balance swaps the CTA to a "Buy Credits" link. Unlike the
 * astrologer drawer, this is a physical service — a pandit performs the
 * pooja at the customer's address — so the form collects a real date, a
 * shipping-style address, and a 6-digit PIN code instead of a free-text time
 * window. On success, mirrors the same brief "submitted" confirmation step
 * (~2000ms auto-close) before navigating to `/pooja-booking/mine`.
 */
export default function PoojaBookingDrawer({ pooja, isOpen, onClose, onBooked }: PoojaBookingDrawerProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();

  const [preferredDate, setPreferredDate] = useState("");
  const [shipAddress, setShipAddress] = useState("");
  const [shipPincode, setShipPincode] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "submitted">("form");

  const balancePaise = user?.walletBalancePaise ?? 0;
  const canAfford = balancePaise >= pooja.basePricePaise;
  const minDate = todayDateInputValue();

  function reset() {
    setPreferredDate("");
    setShipAddress("");
    setShipPincode("");
    setNotes("");
    setError(null);
    setSubmitting(false);
    setStep("form");
  }

  function handleClose() {
    reset();
    onClose();
  }

  function closeAndGoToBookings() {
    reset();
    onClose();
    router.push("/pooja-booking/mine");
  }

  useEffect(() => {
    if (step === "submitted") {
      const timer = setTimeout(closeAndGoToBookings, 2000);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function handlePincodeChange(raw: string) {
    setShipPincode(raw.replace(/\D/g, "").slice(0, 6));
  }

  async function handleSubmit() {
    setError(null);

    if (!preferredDate) {
      setError(t("poojaBooking.dateRequired"));
      return;
    }
    if (preferredDate < minDate) {
      setError(t("poojaBooking.datePast"));
      return;
    }
    const trimmedAddress = shipAddress.trim();
    if (!trimmedAddress) {
      setError(t("poojaBooking.addressRequired"));
      return;
    }
    if (trimmedAddress.length > ADDRESS_MAX) {
      setError(t("poojaBooking.addressTooLong"));
      return;
    }
    if (!PINCODE_RE.test(shipPincode)) {
      setError(t("poojaBooking.pincodeInvalid"));
      return;
    }
    if (notes.length > NOTES_MAX) {
      setError(t("poojaBooking.notesTooLong"));
      return;
    }

    setSubmitting(true);
    try {
      const booking = await api.bookPooja({
        poojaId: pooja.id,
        preferredDate,
        shipAddress: trimmedAddress,
        shipPincode,
        notes: notes.trim() || undefined,
      });
      onBooked(booking);
      setStep("submitted");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("poojaBooking.bookingErrorGeneric"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 z-[100] bg-background border-t border-border rounded-t-[2.5rem] p-6 max-h-[85vh] overflow-y-auto pb-[calc(3rem+var(--sab))]"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-display text-foreground font-bold pr-4">
                {t("poojaBooking.drawerTitle", { name: pooja.name })}
              </h2>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-muted hover:text-foreground shrink-0"
                aria-label={t("common.close")}
              >
                <X size={16} />
              </button>
            </div>

            {step === "submitted" ? (
              <div className="text-center py-6">
                <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-3" />
                <p className="text-sm text-foreground font-semibold mb-1">{t("poojaBooking.successTitle")}</p>
                <p className="text-[11px] text-muted mb-4">{t("poojaBooking.successBody")}</p>
                <button
                  onClick={closeAndGoToBookings}
                  className="px-4 py-2 rounded-xl border border-gold/20 text-xs text-foreground"
                >
                  {t("common.close")}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-muted uppercase tracking-wider block mb-1.5">
                    {t("poojaBooking.dateLabel")}
                  </label>
                  <input
                    type="date"
                    value={preferredDate}
                    min={minDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className="w-full rounded-xl border border-gold/20 bg-surface/40 px-3 py-2.5 text-sm text-foreground"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-muted uppercase tracking-wider block mb-1.5">
                    {t("poojaBooking.addressLabel")}
                  </label>
                  <textarea
                    value={shipAddress}
                    onChange={(e) => setShipAddress(e.target.value)}
                    maxLength={ADDRESS_MAX}
                    rows={3}
                    placeholder={t("poojaBooking.addressPlaceholder")}
                    className="w-full rounded-xl border border-gold/20 bg-surface/40 px-3 py-2.5 text-sm text-foreground placeholder:text-muted resize-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-muted uppercase tracking-wider block mb-1.5">
                    {t("poojaBooking.pincodeLabel")}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={shipPincode}
                    onChange={(e) => handlePincodeChange(e.target.value)}
                    maxLength={6}
                    placeholder={t("poojaBooking.pincodePlaceholder")}
                    className="w-full rounded-xl border border-gold/20 bg-surface/40 px-3 py-2.5 text-sm text-foreground placeholder:text-muted"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-muted uppercase tracking-wider block mb-1.5">
                    {t("poojaBooking.notesLabel")}
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    maxLength={NOTES_MAX}
                    rows={3}
                    placeholder={t("poojaBooking.notesPlaceholder")}
                    className="w-full rounded-xl border border-gold/20 bg-surface/40 px-3 py-2.5 text-sm text-foreground placeholder:text-muted resize-none"
                  />
                </div>

                {error && <p className="text-xs text-red-400">{error}</p>}

                {canAfford ? (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-gold text-[#1a0e00] rounded-xl font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting
                      ? t("poojaBooking.submitting")
                      : t("poojaBooking.bookButton", { price: formatRupees(pooja.basePricePaise) })}
                  </button>
                ) : (
                  <div className="w-full">
                    <p className="text-xs text-red-400 mb-2 text-center">{t("poojaBooking.insufficientBalance")}</p>
                    <button
                      onClick={() => router.push("/payment")}
                      className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-gold text-[#1a0e00] rounded-xl font-bold transition-all active:scale-[0.98]"
                    >
                      {t("payment.buyCredits")}
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
