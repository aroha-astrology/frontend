"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Loader2, Trash2, X, Check, MessageCircle, ChevronDown, ChevronUp } from "lucide-react";
import IconButton from "@/components/ui/IconButton";
import Card from "@/components/ui/Card";
import StatusPill, { type StatusPillTone } from "@/components/ui/StatusPill";
import {
  api,
  ApiError,
  type Astrologer,
  type AstrologerBooking,
  type AstrologerBookingStatus,
} from "@/lib/api";
import { formatRupees } from "@/lib/format";

/** Tone map from StatusPill's own JSDoc for AstrologerBookingStatus. */
const STATUS_TONE: Record<AstrologerBookingStatus, StatusPillTone> = {
  requested: "pending",
  confirmed: "info",
  completed: "success",
  declined: "danger",
  cancelled: "neutral",
  refunded: "success",
};

interface BookingRowProps {
  booking: AstrologerBooking;
  astrologer: Astrologer | undefined;
  onCancelled: (updated: AstrologerBooking) => void;
}

function BookingRow({ booking, astrologer, onCancelled }: BookingRowProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const name = astrologer?.displayName ?? t("astrologerBookings.unknownAstrologer");
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  // Backend only allows cancellation while a booking is still "requested" —
  // don't offer the affordance for any other status rather than relying on
  // a 409 from the backend as the primary UX.
  const canCancel = booking.status === "requested";
  const canChat = booking.status === "confirmed" || booking.status === "completed";

  async function handleConfirmCancel() {
    setCancelling(true);
    setCancelError(null);
    try {
      const updated = await api.cancelAstrologerBooking(booking.astrologerId, booking.id);
      onCancelled(updated);
    } catch (err) {
      setCancelError(err instanceof ApiError ? err.message : t("astrologerBookings.cancelError"));
    } finally {
      setCancelling(false);
      setConfirmCancel(false);
    }
  }

  function handleRowClick() {
    if (canChat) router.push(`/astrologers/bookings/${booking.id}/chat`);
    else if (booking.notes) setExpanded((e) => !e);
  }

  return (
    <Card className="p-4 border-gold/10">
      <div
        className={`flex items-start justify-between gap-2 ${canChat || booking.notes ? "cursor-pointer" : ""}`}
        onClick={handleRowClick}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
            {astrologer?.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={astrologer.photoUrl} alt={name} className="w-full h-full object-cover rounded-full" />
            ) : (
              <div className="w-full h-full rounded-full bg-gradient-to-br from-gold/80 to-purple-600/60 flex items-center justify-center text-[#1a0e00] font-display text-sm">
                {initial}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{name}</p>
            <p className="text-[11px] text-muted mt-0.5 truncate">{booking.preferredTimeWindow}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <StatusPill tone={STATUS_TONE[booking.status]} label={t(`astrologerBookings.status.${booking.status}`)} />

          {canCancel &&
            (confirmCancel ? (
              <div className="flex items-center gap-1 bg-red-500/10 rounded-lg px-2 py-1">
                <span className="text-[10px] text-red-400 font-medium mr-1">
                  {t("astrologerBookings.cancelConfirmLabel")}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmCancel(false);
                  }}
                  disabled={cancelling}
                  className="p-1 hover:bg-white/10 rounded-md text-muted"
                >
                  <X size={12} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleConfirmCancel();
                  }}
                  disabled={cancelling}
                  className="p-1 hover:bg-white/10 rounded-md text-red-400"
                >
                  <Check size={12} />
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmCancel(true);
                }}
                className="p-1.5 text-muted hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors"
              >
                <Trash2 size={14} />
              </button>
            ))}

          {canChat && <MessageCircle size={16} className="text-gold" />}

          {booking.notes &&
            !canChat &&
            (expanded ? (
              <ChevronUp size={14} className="text-muted" />
            ) : (
              <ChevronDown size={14} className="text-muted" />
            ))}
        </div>
      </div>

      {cancelError && <p className="text-[11px] text-red-400 mt-2">{cancelError}</p>}

      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gold/10">
        <p className="text-[10px] text-muted">{new Date(booking.requestedAt).toLocaleDateString()}</p>
        <p className="text-[11px] font-medium text-gold">{formatRupees(booking.pricePaisePaid)}</p>
      </div>

      {expanded && booking.notes && (
        <div className="mt-2 pt-2 border-t border-gold/10">
          <p className="text-[11px] text-foreground/80 leading-relaxed">{booking.notes}</p>
        </div>
      )}
    </Card>
  );
}

export default function AstrologerBookingsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [bookings, setBookings] = useState<AstrologerBooking[]>([]);
  const [astrologers, setAstrologers] = useState<Astrologer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([api.myAstrologerBookings(), api.listAstrologers()])
      .then(([b, a]) => {
        setBookings(b);
        setAstrologers(a);
      })
      .catch(() => setError(t("astrologerBookings.loadError")))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  function handleCancelled(updated: AstrologerBooking) {
    setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  }

  return (
    <main className="min-h-screen pb-tab-safe bg-background">
      <div className="px-5 pt-8">
        <div className="flex items-center gap-3 mb-6">
          <IconButton onClick={() => router.back()} aria-label={t("common.back")}>
            <ArrowLeft size={18} />
          </IconButton>
          <h1 className="text-lg font-display text-foreground">{t("astrologerBookings.title")}</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={24} className="animate-spin text-gold" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 py-10">
            <p className="text-[12px] text-red-400 text-center">{error}</p>
            <button onClick={load} className="text-[12px] text-gold underline underline-offset-2">
              {t("astrologerBookings.retry")}
            </button>
          </div>
        ) : bookings.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-muted">{t("astrologerBookings.emptyState")}</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => (
              <BookingRow
                key={b.id}
                booking={b}
                astrologer={astrologers.find((a) => a.id === b.astrologerId)}
                onCancelled={handleCancelled}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
