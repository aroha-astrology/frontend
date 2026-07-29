"use client";

import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { PhoneOff, Loader2 } from "lucide-react";
import { ASTROLOGER } from "@/lib/personas";
import type { VoiceCall } from "@/hooks/useVoiceCall";

/**
 * The in-call screen: a full-bleed overlay that takes over the chat while a
 * voice session is live, in place of the small countdown strip the old inline
 * mic button showed above the composer.
 *
 * It stays mounted for one beat after the call ends if the call ended with a
 * message worth reading ("3-minute limit reached", "not enough credits"). The
 * session is already gone by then — `call.active` is false — so this renders as
 * a dismissible ended-call card rather than a live call.
 */
export default function VoiceCallOverlay({ call }: { call: VoiceCall }) {
  const { t } = useTranslation();

  const open = call.active || call.error !== null;
  const speaking = call.state === "speaking";
  const connecting = call.state === "connecting";

  const status = connecting
    ? t("aiChatPage.voiceCallConnecting")
    : speaking
      ? t("aiChatPage.voiceCallSpeaking")
      : call.active
        ? t("aiChatPage.voiceCallListening")
        : t("aiChatPage.voiceChatEnded");

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-label={t("aiChatPage.voiceChatTitle")}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center px-8"
          style={{ background: "var(--background)" }}
        >
          {/* Avatar. The rings are the only feedback that the line is actually
              open — there is no waveform, because the audio never passes
              through this app on its way to Google. */}
          <div className="relative flex items-center justify-center mb-8">
            <AnimatePresence>
              {speaking &&
                [0, 1].map((i) => (
                  <motion.span
                    key={i}
                    initial={{ scale: 1, opacity: 0.5 }}
                    animate={{ scale: 1.9, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ repeat: Infinity, duration: 1.8, delay: i * 0.9, ease: "easeOut" }}
                    className="absolute w-28 h-28 rounded-full border-2 border-yellow-500"
                  />
                ))}
            </AnimatePresence>
            <div className="w-28 h-28 rounded-full bg-yellow-500/15 border border-gold/40 flex items-center justify-center text-5xl">
              {ASTROLOGER.avatar}
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gold font-display text-center">
            {t(ASTROLOGER.nameKey)}
          </h2>

          <p className="mt-2 flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
            {connecting && <Loader2 size={14} className="animate-spin" />}
            {status}
          </p>

          {call.active ? (
            <>
              <p className="mt-6 text-3xl font-semibold tabular-nums text-gold">
                {t("aiChatPage.voiceChatCountdown", {
                  minutes: Math.floor(call.secondsLeft / 60),
                  seconds: String(call.secondsLeft % 60).padStart(2, "0"),
                })}
              </p>
              <p className="mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
                {t("aiChatPage.voiceChatRateInfo")}
              </p>

              <button
                onClick={call.stop}
                aria-label={t("aiChatPage.voiceChatStop")}
                className="mt-12 h-16 w-16 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95"
              >
                <PhoneOff size={26} />
              </button>
              <p className="mt-3 text-[11px]" style={{ color: "var(--text-muted)" }}>
                {t("aiChatPage.voiceCallHint")}
              </p>
            </>
          ) : (
            <>
              {call.error && (
                <p className="mt-6 max-w-xs text-center text-sm text-red-400" role="alert">
                  {call.error}
                </p>
              )}
              <button
                onClick={call.dismissError}
                className="mt-10 h-11 px-8 rounded-full border text-sm"
                style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
              >
                {t("common.close")}
              </button>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
