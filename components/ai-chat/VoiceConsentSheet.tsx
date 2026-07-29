"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Mic } from "lucide-react";
import BottomSheetModal from "@/components/ui/BottomSheetModal";

/**
 * One-time opt-in shown before a user's first voice session.
 *
 * Voice consent is deliberately NOT covered by the general data-processing
 * consent granted at onboarding: this streams a live recording of the user's
 * own speech to a third party, on a preview tier whose traffic may be used to
 * improve that third party's products. That is materially more than the general
 * grant, so it is asked for separately and stored separately
 * (`users.voice_consent_at`, with its own `user_consent_log` audit row).
 *
 * The sheet states the price too. That is pricing, not pacing — what the user
 * pays must always be visible before they commit to it.
 */
export default function VoiceConsentSheet({
  onAccept,
  onClose,
}: {
  /** Records consent, then starts the call. Rejects if the grant fails. */
  onAccept: () => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);

  const accept = async () => {
    if (submitting) return;
    setSubmitting(true);
    setFailed(false);
    try {
      await onAccept();
    } catch {
      // Stay open on failure — silently closing would look like consent was
      // recorded when it wasn't, and the user would be asked again next time
      // with no explanation.
      setFailed(true);
      setSubmitting(false);
    }
  };

  return (
    <BottomSheetModal
      onClose={onClose}
      closeLabel={t("common.close")}
      header={
        <h2 className="flex items-center gap-2 text-base font-semibold text-gold">
          <Mic size={18} />
          {t("aiChatPage.voiceChatConsentTitle")}
        </h2>
      }
    >
      <p className="text-sm leading-relaxed text-[var(--text-muted)] mb-4">
        {t("aiChatPage.voiceChatConsentBody")}
      </p>

      <p className="text-xs text-[var(--text-muted)]/80 mb-4">
        {t("aiChatPage.voiceChatRateInfo")}
      </p>

      {failed && (
        <p className="text-sm text-red-400 mb-3" role="alert">
          {t("aiChatPage.voiceChatError")}
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => void accept()}
          disabled={submitting}
          className="flex-1 h-11 rounded-full bg-yellow-500 text-black text-sm font-semibold disabled:opacity-50"
        >
          {t("aiChatPage.voiceChatConsentAccept")}
        </button>
        <button
          onClick={onClose}
          disabled={submitting}
          className="flex-1 h-11 rounded-full border text-sm disabled:opacity-50"
          style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
        >
          {t("aiChatPage.voiceChatConsentDecline")}
        </button>
      </div>
    </BottomSheetModal>
  );
}
