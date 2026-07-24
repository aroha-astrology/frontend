"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/providers/auth-provider";
import { api, ApiError, type Astrologer, type AstrologerBooking } from "@/lib/api";
import { formatRupees } from "@/lib/format";

const TIME_WINDOW_MAX = 200;
const NOTES_MAX = 2000;

export interface AstrologerBookingDrawerProps {
  astrologer: Astrologer;
  isOpen: boolean;
  onClose: () => void;
  onBooked: (booking: AstrologerBooking) => void;
}

/**
 * Bottom-sheet booking form, direct shape-copy of `HouseUnlockDrawer.tsx`:
 * cost baked into the CTA label, insufficient-balance swaps the CTA to a
 * "Buy Credits" link to `/payment`. Free-text `preferredTimeWindow` (no
 * slot picker — matches the backend) plus optional `notes`. On success,
 * shows a brief "submitted" confirmation step mirroring
 * `PurchasePlanModal`'s ~2000ms auto-close-with-manual-fallback pattern,
 * then closes and navigates to `/astrologers/bookings`.
 */
export default function AstrologerBookingDrawer({
  astrologer,
  isOpen,
  onClose,
  onBooked,
}: AstrologerBookingDrawerProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();

  const [preferredTimeWindow, setPreferredTimeWindow] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "submitted">("form");

  const balancePaise = user?.walletBalancePaise ?? 0;
  const canAfford = balancePaise >= astrologer.ratePaisePerSession;

  function reset() {
    setPreferredTimeWindow("");
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
    router.push("/astrologers/bookings");
  }

  useEffect(() => {
    if (step === "submitted") {
      const timer = setTimeout(closeAndGoToBookings, 2000);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  async function handleSubmit() {
    setError(null);
    const trimmedWindow = preferredTimeWindow.trim();
    if (!trimmedWindow) {
      setError(t("astrologers.timeWindowRequired"));
      return;
    }
    if (trimmedWindow.length > TIME_WINDOW_MAX) {
      setError(t("astrologers.timeWindowTooLong"));
      return;
    }
    if (notes.length > NOTES_MAX) {
      setError(t("astrologers.notesTooLong"));
      return;
    }

    setSubmitting(true);
    try {
      const booking = await api.bookAstrologer(astrologer.id, {
        preferredTimeWindow: trimmedWindow,
        notes: notes.trim() || undefined,
      });
      onBooked(booking);
      setStep("submitted");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("astrologers.bookingErrorGeneric"));
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
                {t("astrologers.drawerTitle", { name: astrologer.displayName })}
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
                <p className="text-sm text-foreground font-semibold mb-1">{t("astrologers.successTitle")}</p>
                <p className="text-[11px] text-muted mb-4">{t("astrologers.successBody")}</p>
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
                    {t("astrologers.timeWindowLabel")}
                  </label>
                  <input
                    type="text"
                    value={preferredTimeWindow}
                    onChange={(e) => setPreferredTimeWindow(e.target.value)}
                    maxLength={TIME_WINDOW_MAX}
                    placeholder={t("astrologers.timeWindowPlaceholder")}
                    className="w-full rounded-xl border border-gold/20 bg-surface/40 px-3 py-2.5 text-sm text-foreground placeholder:text-muted"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-muted uppercase tracking-wider block mb-1.5">
                    {t("astrologers.notesLabel")}
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    maxLength={NOTES_MAX}
                    rows={3}
                    placeholder={t("astrologers.notesPlaceholder")}
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
                      ? t("astrologers.submitting")
                      : t("astrologers.bookButton", { price: formatRupees(astrologer.ratePaisePerSession) })}
                  </button>
                ) : (
                  <div className="w-full">
                    <p className="text-xs text-red-400 mb-2 text-center">{t("astrologers.insufficientBalance")}</p>
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
