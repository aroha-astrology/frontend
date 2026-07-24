"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Loader2, Trash2, X, Check, MessageCircle, ChevronDown, ChevronUp, Flame } from "lucide-react";
import IconButton from "@/components/ui/IconButton";
import Card from "@/components/ui/Card";
import StatusPill, { type StatusPillTone } from "@/components/ui/StatusPill";
import {
  api,
  ApiError,
  type PoojaCatalogItem,
  type PoojaBooking,
  type PoojaBookingStatus,
} from "@/lib/api";
import { formatRupees } from "@/lib/format";

/** Tone map from StatusPill's own JSDoc for PoojaBookingStatus. */
const STATUS_TONE: Record<PoojaBookingStatus, StatusPillTone> = {
  requested: "pending",
  assigned: "info",
  completed: "success",
  cancelled: "neutral",
  refunded: "success",
};

interface BookingRowProps {
  booking: PoojaBooking;
  pooja: PoojaCatalogItem | undefined;
  onCancelled: (updated: PoojaBooking) => void;
}

function BookingRow({ booking, pooja, onCancelled }: BookingRowProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const name = pooja?.name ?? t("poojaBookings.unknownPooja");
  // Backend allows cancellation while a booking is still "requested" or
  // "assigned" (unlike astrologer bookings, which only allow it at
  // "requested") — a pandit not yet having started is still cancellable.
  const canCancel = booking.status === "requested" || booking.status === "assigned";
  // Chat only unlocks once a pandit is assigned — a "requested" booking has
  // no panditId yet, so there's no one on the other end of the thread.
  const canChat = booking.status === "assigned" || booking.status === "completed";
  const isWaitingForPandit = booking.status === "requested";

  async function handleConfirmCancel() {
    setCancelling(true);
    setCancelError(null);
    try {
      const updated = await api.cancelPoojaBooking(booking.id);
      onCancelled(updated);
    } catch (err) {
      setCancelError(err instanceof ApiError ? err.message : t("poojaBookings.cancelError"));
    } finally {
      setCancelling(false);
      setConfirmCancel(false);
    }
  }

  function handleRowClick() {
    if (canChat) router.push(`/pooja-booking/mine/${booking.id}/chat`);
    else setExpanded((e) => !e);
  }

  let formattedDate = booking.preferredDate;
  try {
    formattedDate = new Date(booking.preferredDate).toLocaleDateString();
  } catch {
    /* keep raw string */
  }

  return (
    <Card className="p-4 border-gold/10">
      <div className="flex items-start justify-between gap-2 cursor-pointer" onClick={handleRowClick}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-gold/10 flex items-center justify-center text-gold shrink-0">
            <Flame size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{name}</p>
            {pooja?.deity && <p className="text-[11px] text-muted mt-0.5 truncate">{pooja.deity}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <StatusPill tone={STATUS_TONE[booking.status]} label={t(`poojaBookings.status.${booking.status}`)} />

          {canCancel &&
            (confirmCancel ? (
              <div className="flex items-center gap-1 bg-red-500/10 rounded-lg px-2 py-1">
                <span className="text-[10px] text-red-400 font-medium mr-1">
                  {t("poojaBookings.cancelConfirmLabel")}
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

          {!canChat && (expanded ? <ChevronUp size={14} className="text-muted" /> : <ChevronDown size={14} className="text-muted" />)}
        </div>
      </div>

      {cancelError && <p className="text-[11px] text-red-400 mt-2">{cancelError}</p>}

      {isWaitingForPandit && (
        <p className="text-[11px] text-muted italic mt-2">{t("poojaBookings.waitingForPandit")}</p>
      )}

      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gold/10">
        <p className="text-[10px] text-muted">{formattedDate}</p>
        <p className="text-[11px] font-medium text-gold">{formatRupees(booking.pricePaisePaid)}</p>
      </div>

      {expanded && !canChat && (
        <div className="mt-2 pt-2 border-t border-gold/10 space-y-1">
          <p className="text-[11px] text-foreground/80 leading-relaxed">
            {booking.shipAddress} — {booking.shipPincode}
          </p>
          {booking.notes && <p className="text-[11px] text-foreground/80 leading-relaxed">{booking.notes}</p>}
        </div>
      )}
    </Card>
  );
}

export default function PoojaBookingsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [bookings, setBookings] = useState<PoojaBooking[]>([]);
  const [catalog, setCatalog] = useState<PoojaCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([api.myPoojaBookings(), api.poojaCatalog()])
      .then(([b, c]) => {
        setBookings(b.items);
        setCatalog(c.items);
      })
      .catch(() => setError(t("poojaBookings.loadError")))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  function handleCancelled(updated: PoojaBooking) {
    setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  }

  return (
    <main className="min-h-screen pb-tab-safe bg-background">
      <div className="px-5 pt-8">
        <div className="flex items-center gap-3 mb-6">
          <IconButton onClick={() => router.back()} aria-label={t("common.back")}>
            <ArrowLeft size={18} />
          </IconButton>
          <h1 className="text-lg font-display text-foreground">{t("poojaBookings.title")}</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={24} className="animate-spin text-gold" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 py-10">
            <p className="text-[12px] text-red-400 text-center">{error}</p>
            <button onClick={load} className="text-[12px] text-gold underline underline-offset-2">
              {t("poojaBookings.retry")}
            </button>
          </div>
        ) : bookings.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-muted">{t("poojaBookings.emptyState")}</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => (
              <BookingRow
                key={b.id}
                booking={b}
                pooja={catalog.find((c) => c.id === b.poojaId)}
                onCancelled={handleCancelled}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
