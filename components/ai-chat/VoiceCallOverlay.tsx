"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { PhoneOff, Loader2, Wallet } from "lucide-react";
import { ASTROLOGER } from "@/lib/personas";
import { formatRupees } from "@/lib/format";
import YogiBabaAvatar from "@/components/ui/YogiBabaAvatar";
import type { VoiceCall } from "@/hooks/useVoiceCall";

/**
 * The in-call screen: a full-bleed overlay that takes over the chat while a
 * voice session is live, in place of the small countdown strip the old inline
 * mic button showed above the composer.
 *
 * It stays mounted for one beat after the call ends if the call ended with a
 * message worth reading ("your wallet ran out", "you left the app"). The
 * session is already gone by then — `call.active` is false — so this renders as
 * a dismissible ended-call card rather than a live call.
 *
 * While the call runs it also says what the minute costs (a free Pass minute,
 * or the wallet price), warns when little talk time is left so the member can
 * recharge, and says that minimizing the app ends the call.
 *
 * **The portal is load-bearing, not stylistic.** The trigger that renders this
 * lives inside the chat header's `-translate-y-1/2` wrapper, and a transformed
 * ancestor becomes the containing block for `position: fixed` descendants — so
 * rendered in place, `fixed inset-0` resolves against a 40px button box and the
 * call screen collapses into an unreadable column of text over the header.
 * (PageTransition's animated `motion.div` is a second such ancestor further up,
 * which is why the composer bar deliberately avoids `fixed` too.) Escaping to
 * `document.body` is the only way this reliably covers the viewport; see
 * BottomSheetModal, which portals for the same reason.
 */
export default function VoiceCallOverlay({ call }: { call: VoiceCall }) {
  const { t } = useTranslation();
  const router = useRouter();

  // `document` does not exist during SSR, and portalling on the very first
  // client render would not match the server-rendered markup — so mount first,
  // then portal.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const open = call.active || call.error !== null;
  const speaking = call.state === "speaking";
  const connecting = call.state === "connecting";
  const price = formatRupees(call.pricePerMinutePaise);

  // The wallet can only be topped up on the payment page, and a call does not
  // outlive its screen — so recharging means ending the call first. The button
  // says so, rather than leaving the member to find out by losing the call.
  const endAndRecharge = () => {
    call.stop();
    router.push("/payment");
  };

  const status = connecting
    ? t("aiChatPage.voiceCallConnecting")
    : speaking
      ? t("aiChatPage.voiceCallSpeaking")
      : call.active
        ? t("aiChatPage.voiceCallListening")
        : t("aiChatPage.voiceChatEnded");

  if (!mounted) return null;

  return createPortal(
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
            <YogiBabaAvatar size={112} className="border-2" />
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
              <p className="mt-1 text-[11px]" style={{ color: "var(--text-muted)" }} data-testid="voice-rate">
                {call.freeMinute
                  ? t("aiChatPage.voiceCallFreeMinute", { price })
                  : t("aiChatPage.voiceCallPaidMinute", { price })}
              </p>

              {call.lowBalance && (
                <div
                  role="status"
                  data-testid="voice-low-balance"
                  className="mt-5 flex max-w-xs flex-col items-center gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-center"
                >
                  <p className="text-xs leading-snug text-amber-300">
                    {t("aiChatPage.voiceCallLowBalance", { minutes: Math.max(1, Math.ceil(call.secondsLeft / 60)) })}
                  </p>
                  <button
                    onClick={endAndRecharge}
                    className="flex items-center gap-1.5 rounded-full border border-amber-500/50 px-3 py-1.5 text-[11px] font-semibold text-amber-200"
                  >
                    <Wallet size={13} />
                    {t("aiChatPage.voiceCallRecharge")}
                  </button>
                </div>
              )}

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
              <p className="mt-6 max-w-xs text-center text-[11px]" style={{ color: "var(--text-muted)" }}>
                {t("aiChatPage.voiceCallKeepOpen")}
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
    </AnimatePresence>,
    document.body,
  );
}
