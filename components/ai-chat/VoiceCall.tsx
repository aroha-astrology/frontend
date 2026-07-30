"use client";

import { useTranslation } from "react-i18next";
import { Phone } from "lucide-react";
import { useVoiceCall } from "@/hooks/useVoiceCall";
import VoiceCallOverlay from "./VoiceCallOverlay";
import VoiceConsentSheet from "./VoiceConsentSheet";

/**
 * The voice-call entry point: a call icon that sits in the chat header, beside
 * the astrologer's name, and the full-screen call UI it opens.
 *
 * Both live in this one component because they are driven by a single session
 * (see `useVoiceCall`) — the overlay is `position: fixed`, so declaring it here
 * inside the header costs nothing in layout terms and saves routing the call
 * state through context to reach a second mount point.
 */
export default function VoiceCall({ locale }: { locale: string }) {
  const { t } = useTranslation();
  const call = useVoiceCall(locale);

  if (!call.available) return null;

  return (
    <>
      <button
        onClick={call.start}
        aria-label={t("aiChatPage.voiceChatStart")}
        title={t("aiChatPage.voiceChatRateInfo")}
        className="h-10 w-10 shrink-0 rounded-full border flex items-center justify-center text-gold transition-colors active:bg-gold/10"
        style={{ borderColor: "var(--border)" }}
      >
        <Phone size={18} />
      </button>

      <VoiceCallOverlay call={call} />

      {call.showConsent && (
        <VoiceConsentSheet onAccept={call.acceptConsent} onClose={call.dismissConsent} />
      )}
    </>
  );
}
