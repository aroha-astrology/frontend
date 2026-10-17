"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Phone } from "lucide-react";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import PassLock from "@/components/pass/PassLock";
import { useVoiceCall } from "@/hooks/useVoiceCall";
import { formatRupees } from "@/lib/format";
import { PASS_VOICE_FREE_MINUTES_RANGE, VOICE_TRIAL_MINUTES } from "@/lib/pass-api";
import VoiceCallFeedbackSheet from "./VoiceCallFeedbackSheet";
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
 * Voice call is an Aroha Pass benefit, and every user gets a few minutes free
 * once (the trial). The icon is shown to everyone; for someone with neither a
 * Pass nor trial minutes left the server refuses the call and the tap opens the
 * same Pass lock the other Pass-only features use.
 *
 * `/ai-chat?call=1` (the trial launch notification) points the icon out with a
 * pulse and a "free minutes" bubble. It does not start the call itself: the
 * browser only opens the microphone and plays audio after a tap.
 */
export default function VoiceCall({ locale }: { locale: string }) {
  const { t } = useTranslation();
  const call = useVoiceCall(locale);

  // Read from window, not useSearchParams, like the page's own `?q=` (no Suspense boundary needed).
  const [pointedTo, setPointedTo] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("call") === "1") setPointedTo(true);
  }, []);
  const showBubble = pointedTo && call.trialOffered && !call.active;

  if (!call.available) return null;

  const price = formatRupees(call.pricePerMinutePaise);
  const start = () => {
    setPointedTo(false);
    call.start();
  };

  return (
    <>
      <button
        onClick={start}
        aria-label={t("aiChatPage.voiceChatStart")}
        title={t("aiChatPage.voiceChatRateInfo", { price, minutes: PASS_VOICE_FREE_MINUTES_RANGE })}
        className={`relative h-10 w-10 shrink-0 rounded-full border flex items-center justify-center text-gold transition-colors active:bg-gold/10${showBubble ? " ring-2 ring-yellow-500/70 animate-pulse" : ""}`}
        style={{ borderColor: "var(--border)" }}
      >
        <Phone size={18} />
      </button>

      {showBubble && (
        <button
          onClick={start}
          data-testid="voice-trial-bubble"
          className="absolute left-0 top-full z-10 mt-2 whitespace-nowrap rounded-full bg-yellow-500 px-3 py-1.5 text-[11px] font-semibold text-black shadow-lg"
        >
          {t("aiChatPage.voiceTrialBubble", { minutes: VOICE_TRIAL_MINUTES })}
        </button>
      )}

      <VoiceCallOverlay call={call} />

      {call.showConsent && (
        <VoiceConsentSheet
          price={price}
          trialMinutes={call.trialOffered ? VOICE_TRIAL_MINUTES : undefined}
          onAccept={call.acceptConsent}
          onClose={call.dismissConsent}
        />
      )}

      {/* After the call screen has closed (an end-of-call message is read first) and no Pass lock is up. */}
      {call.feedbackFor && !call.active && call.error === null && !call.showPassLock && (
        <VoiceCallFeedbackSheet voiceSessionId={call.feedbackFor} onClose={call.dismissFeedback} />
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
          {call.trialUsed && (
            <p className="mb-3 text-sm leading-snug text-amber-300" data-testid="voice-trial-used">
              {t("aiChatPage.voiceTrialUsed", { minutes: VOICE_TRIAL_MINUTES })}
            </p>
          )}
          <PassLock
            feature={t("aiChatPage.voiceChatTitle")}
            need="voiceCall"
            note={t("pass.lock.voiceTerms", { minutes: PASS_VOICE_FREE_MINUTES_RANGE, price })}
            className="border-0 p-0"
          />
        </BottomSheetModal>
      )}
    </>
  );
}
