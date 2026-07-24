"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { api, ApiError, type Astrologer, type AstrologerBooking } from "@/lib/api";
import BookingChatConversation from "@/components/booking-chat/BookingChatConversation";

type ChatPageState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; booking: AstrologerBooking; astrologer: Astrologer | undefined };

/**
 * Thin route wrapper: fetches the specific booking (via myAstrologerBookings
 * — no per-id GET exists) and the astrologer list to resolve the
 * counterpart's display name/photo, then renders the shared
 * BookingChatConversation for that thread.
 */
export default function AstrologerBookingChatPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams<{ bookingId: string }>();
  const bookingId = params.bookingId;

  const [state, setState] = useState<ChatPageState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.myAstrologerBookings(), api.listAstrologers()])
      .then(([bookings, astrologers]) => {
        if (cancelled) return;
        const booking = bookings.find((b) => b.id === bookingId);
        if (!booking) {
          setState({ status: "error", message: t("astrologerBookings.bookingNotFound") });
          return;
        }
        setState({ status: "ready", booking, astrologer: astrologers.find((a) => a.id === booking.astrologerId) });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({
          status: "error",
          message: err instanceof ApiError ? err.message : t("astrologerBookings.loadError"),
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

  const counterpartName = state.astrologer?.displayName ?? t("astrologerBookings.unknownAstrologer");

  return (
    <BookingChatConversation
      bookingType="astrologer"
      bookingId={state.booking.id}
      viewerRole="customer"
      counterpartName={counterpartName}
      counterpartPhotoUrl={state.astrologer?.photoUrl}
      onBack={() => router.back()}
    />
  );
}
