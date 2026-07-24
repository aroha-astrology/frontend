"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { api, ApiError, type PoojaCatalogItem, type PoojaBooking } from "@/lib/api";
import BookingChatConversation from "@/components/booking-chat/BookingChatConversation";

type ChatPageState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; booking: PoojaBooking; pooja: PoojaCatalogItem | undefined };

/**
 * Thin route wrapper, same shape as
 * `app/astrologers/bookings/[bookingId]/chat/page.tsx`: resolves the
 * specific booking (via `myPoojaBookings()` — no per-id GET exists) and the
 * pooja catalog (for context) client-side, then renders the shared
 * `BookingChatConversation` for that thread.
 *
 * The backend never exposes a pandit's name/photo on the booking or catalog
 * response — only `panditId` — and there's no pandit-directory endpoint for
 * customers to resolve a name from, so the counterpart is always shown
 * under a generic, translated "Your Pandit" fallback label rather than a
 * fabricated lookup.
 */
export default function PoojaBookingChatPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams<{ bookingId: string }>();
  const bookingId = params.bookingId;

  const [state, setState] = useState<ChatPageState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.myPoojaBookings(), api.poojaCatalog()])
      .then(([bookings, catalog]) => {
        if (cancelled) return;
        const booking = bookings.items.find((b) => b.id === bookingId);
        if (!booking) {
          setState({ status: "error", message: t("poojaBookings.bookingNotFound") });
          return;
        }
        setState({ status: "ready", booking, pooja: catalog.items.find((p) => p.id === booking.poojaId) });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({
          status: "error",
          message: err instanceof ApiError ? err.message : t("poojaBookings.loadError"),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId, t]);

  if (state.status === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 size={24} className="animate-spin text-gold" />
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <p className="text-sm text-red-400">{state.message}</p>
        <button onClick={() => router.back()} className="text-xs text-gold underline underline-offset-2">
          {t("common.back")}
        </button>
      </main>
    );
  }

  return (
    <BookingChatConversation
      bookingType="pooja"
      bookingId={state.booking.id}
      viewerRole="customer"
      counterpartName={t("poojaBookings.yourPandit")}
      counterpartPhotoUrl={null}
      onBack={() => router.back()}
    />
  );
}
