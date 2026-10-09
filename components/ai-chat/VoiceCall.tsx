"use client";

import { useTranslation } from "react-i18next";
import { Phone } from "lucide-react";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import PassLock from "@/components/pass/PassLock";
import { useVoiceCall } from "@/hooks/useVoiceCall";
import { formatRupees } from "@/lib/format";
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
 *
 * Voice call is an Aroha Pass benefit. The icon is shown to everyone; for
 * someone without a Pass the server refuses the call and the tap opens the
 * same Pass lock the other Pass-only features use.
 */
export default function VoiceCall({ locale }: { locale: string }) {
  const { t } = useTranslation();
  const call = useVoiceCall(locale);

  if (!call.available) return null;

  const price = formatRupees(call.pricePerMinutePaise);

  return (
    <>
      <button
        onClick={call.start}
        aria-label={t("aiChatPage.voiceChatStart")}
        title={t("aiChatPage.voiceChatRateInfo", { price })}
        className="h-10 w-10 shrink-0 rounded-full border flex items-center justify-center text-gold transition-colors active:bg-gold/10"
        style={{ borderColor: "var(--border)" }}
      >
        <Phone size={18} />
      </button>

      <VoiceCallOverlay call={call} />

      {call.showConsent && (
        <VoiceConsentSheet price={price} onAccept={call.acceptConsent} onClose={call.dismissConsent} />
      )}

      {call.showPassLock && (
        <BottomSheetModal
          onClose={call.dismissPassLock}
          closeLabel={t("common.close")}
          header={
            <h2 className="flex items-center gap-2 text-base font-semibold text-gold">
              <Phone size={18} />
              {t("aiChatPage.voiceChatTitle")}
            </h2>
          }
        >
          <PassLock feature={t("aiChatPage.voiceChatTitle")} need="voiceCall" className="border-0 p-0" />
        </BottomSheetModal>
      )}
    </>
  );
}
