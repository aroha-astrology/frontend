"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Mic, PhoneOff, Loader2 } from "lucide-react";
import { useFeature } from "@/hooks/useFeature";
import { useAuth } from "@/providers/auth-provider";
import {
  startVoiceSession,
  extendVoiceSession,
  endVoiceSession,
  grantVoiceConsent,
  SwarmApiError,
  type VoiceGrant,
} from "@/lib/swarm-api";
import { GeminiLiveSession, type VoiceSessionState } from "@/lib/voice/gemini-live-client";
import VoiceConsentSheet from "./VoiceConsentSheet";

/**
 * Owns a realtime voice call end to end: gating, consent, the per-minute
 * purchase loop, and teardown.
 *
 * The unusual part is the purchase loop. A session's audio goes straight from
 * the browser to Google, so the backend cannot meter it by watching traffic —
 * instead each minute is a separately bought, separately expiring token. This
 * component is what buys the next one, via the `onNeedNextMinute` callback the
 * live client invokes shortly before the current minute lapses. Returning null
 * there ends the call, which is how the 3-minute ceiling and an empty wallet
 * both surface: as the server simply declining to sell the next minute.
 */
export default function VoiceChatButton({ locale }: { locale: string }) {
  const { t } = useTranslation();
  const { user, refresh } = useAuth();
  const feature = useFeature("paid.voiceChat");

  const [showConsent, setShowConsent] = useState(false);
  const [state, setState] = useState<VoiceSessionState | "idle">("idle");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<GeminiLiveSession | null>(null);
  const grantRef = useRef<VoiceGrant | null>(null);

  const active = state !== "idle" && state !== "closed";

  const teardown = useCallback(async () => {
    const session = sessionRef.current;
    sessionRef.current = null;
    await session?.stop();

    const grant = grantRef.current;
    grantRef.current = null;
    if (grant) {
      // Best-effort: the wallet was already charged per granted minute, so a
      // failure here costs nothing but a stale `active` row.
      await endVoiceSession(grant.voiceSessionId).catch(() => {});
    }

    setState("idle");
    setSecondsLeft(0);
    // Minutes are charged as they are granted, so the balance in the top bar is
    // stale the moment a call ends.
    refresh().catch(() => {});
  }, [refresh]);

  /**
   * Time left in the whole call: what remains of the current paid minute, plus
   * the minutes the server would still be willing to sell. Derived from the
   * grant rather than counted up from a start time, so it stays honest if a
   * renewal is late or the ceiling is lowered server-side mid-call.
   */
  const recomputeSecondsLeft = useCallback(() => {
    const grant = grantRef.current;
    if (!grant) return setSecondsLeft(0);
    const thisMinute = Math.max(0, grant.expiresAt - Date.now());
    setSecondsLeft(Math.ceil(thisMinute / 1000) + grant.minutesRemaining * 60);
  }, []);

  useEffect(() => {
    if (!active) return;
    recomputeSecondsLeft();
    const id = setInterval(recomputeSecondsLeft, 1000);
    return () => clearInterval(id);
  }, [active, recomputeSecondsLeft]);

  // A call must not outlive the screen. Without this, navigating away leaves
  // the mic open and the minute loop buying time nobody is listening to.
  useEffect(() => {
    return () => {
      void sessionRef.current?.stop();
      const grant = grantRef.current;
      if (grant) void endVoiceSession(grant.voiceSessionId).catch(() => {});
    };
  }, []);

  const begin = useCallback(
    async (firstGrant: VoiceGrant) => {
      grantRef.current = firstGrant;

      const session = new GeminiLiveSession({
        onStateChange: setState,
        // `onNeedNextMinute` below already stores the new grant (with the full
        // server payload); this just snaps the countdown to it immediately
        // rather than waiting up to a second for the next tick.
        onMinuteGranted: () => recomputeSecondsLeft(),
        onError: (err) => {
          setError(err.message);
          void teardown();
        },
        onClosed: () => {
          setState("idle");
        },
        onNeedNextMinute: async () => {
          const current = grantRef.current;
          const live = sessionRef.current;
          if (!current || !live) return null;

          try {
            const next = await extendVoiceSession(
              current.voiceSessionId,
              locale,
              live.currentResumptionHandle,
            );
            grantRef.current = next;
            return next;
          } catch (err) {
            // 409 covers both "ceiling reached" and "out of credits". Neither
            // is an error the user did anything wrong to cause, so the call
            // just ends rather than showing a failure.
            if (err instanceof SwarmApiError && err.status === 409) {
              setError(t("aiChatPage.voiceChatLimitReached"));
              return null;
            }
            throw err;
          }
        },
      });

      sessionRef.current = session;
      await session.start(firstGrant);
    },
    [locale, recomputeSecondsLeft, t, teardown],
  );

  const handleStart = useCallback(async () => {
    setError(null);
    setState("connecting");
    try {
      const grant = await startVoiceSession(locale);
      await begin(grant);
    } catch (err) {
      setState("idle");
      if (err instanceof SwarmApiError && err.message.includes("VOICE_CONSENT_REQUIRED")) {
        setShowConsent(true);
        return;
      }
      setError(
        err instanceof SwarmApiError && err.status === 409
          ? t("aiChatPage.outOfCreditReply")
          : t("aiChatPage.voiceChatError"),
      );
    }
  }, [begin, locale, t]);

  const handleConsentAccept = useCallback(async () => {
    await grantVoiceConsent();
    await refresh().catch(() => {});
    setShowConsent(false);
    await handleStart();
  }, [handleStart, refresh]);

  // Both gates, exactly as the server enforces them: the admin flag, and — for
  // rendering only — nothing else. Consent is NOT checked here; a user who has
  // never consented still sees the button, and tapping it opens the sheet.
  // Hiding it from them instead would leave no way to ever grant consent.
  if (!feature.enabled || !user) return null;

  return (
    <>
      <button
        onClick={() => (active ? void teardown() : void handleStart())}
        disabled={state === "connecting"}
        aria-label={active ? t("aiChatPage.voiceChatStop") : t("aiChatPage.voiceChatStart")}
        title={active ? t("aiChatPage.voiceChatStop") : t("aiChatPage.voiceChatRateInfo")}
        className={`h-14 w-14 shrink-0 rounded-full flex items-center justify-center transition-colors disabled:opacity-50 ${
          active ? "bg-red-500 text-white" : "border text-gold"
        }`}
        style={active ? undefined : { borderColor: "var(--border)" }}
      >
        {state === "connecting" ? (
          <Loader2 size={20} className="animate-spin" />
        ) : active ? (
          <PhoneOff size={20} />
        ) : (
          <Mic size={20} />
        )}
      </button>

      {active && (
        <div className="absolute -top-6 left-0 right-0 text-center text-[11px] text-[var(--text-muted)]">
          {state === "speaking" ? "●" : "○"}{" "}
          {t("aiChatPage.voiceChatCountdown", {
            minutes: Math.floor(secondsLeft / 60),
            seconds: String(secondsLeft % 60).padStart(2, "0"),
          })}
        </div>
      )}

      {error && !active && (
        <div className="absolute -top-6 left-0 right-0 text-center text-[11px] text-red-400">
          {error}
        </div>
      )}

      {showConsent && (
        <VoiceConsentSheet
          onAccept={handleConsentAccept}
          onClose={() => setShowConsent(false)}
        />
      )}
    </>
  );
}
