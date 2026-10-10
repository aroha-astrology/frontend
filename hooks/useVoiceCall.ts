"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
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
import { GeminiLiveSession, VoiceCallError, type VoiceSessionState } from "@/lib/voice/gemini-live-client";
import { startBackgroundCall, stopBackgroundCall } from "@/lib/voice/background-call";

/** `"idle"` is this hook's own resting state, not one the live client reports. */
export type VoiceCallState = VoiceSessionState | "idle";

/** Shown when the server has no price configured for voice (it charges the same fallback). */
const DEFAULT_MINUTE_PRICE_PAISE = 2000;

/**
 * With this much talk time left (free minutes plus what the wallet covers) the
 * call screen tells the member to recharge. Three minutes, the owner's choice:
 * long enough to finish a thought and decide, short enough not to nag a member
 * who has plenty.
 */
const LOW_BALANCE_SECONDS = 180;

export interface VoiceCall {
  /** False when the feature is off or nobody is signed in — render no entry point at all. */
  available: boolean;
  state: VoiceCallState;
  /** A call is being set up or is running: the call UI belongs on screen. */
  active: boolean;
  /** Whole-call time left in seconds (current minute + the free and wallet minutes still to come). */
  secondsLeft: number;
  /** Little talk time left: the call screen shows the recharge notice. */
  lowBalance: boolean;
  /** The minute now running is one of the member's free Pass minutes. */
  freeMinute: boolean;
  /** What a wallet minute costs, in paise, for the labels. */
  pricePerMinutePaise: number;
  error: string | null;
  showConsent: boolean;
  /** Voice call is an Aroha Pass benefit and this user has no Pass that includes it. */
  showPassLock: boolean;
  start: () => void;
  stop: () => void;
  acceptConsent: () => Promise<void>;
  dismissConsent: () => void;
  dismissPassLock: () => void;
  dismissError: () => void;
}

/** The server names its refusals in the error message (`PASS_REQUIRED`, `VOICE_OUT_OF_CREDIT`, ...). */
function refusedWith(err: unknown, code: string): boolean {
  return err instanceof SwarmApiError && (err.code === code || err.message.includes(code));
}

/**
 * Owns a realtime voice call end to end: gating, consent, the per-minute
 * loop, and teardown. Split out of the old VoiceChatButton so the trigger (a
 * call icon in the chat header) and the call UI it opens can be two separate
 * pieces of markup driven by one session.
 *
 * The unusual part is the minute loop. A session's audio goes straight from
 * the browser to Google, so the backend cannot meter it by watching traffic —
 * instead each minute is a separately granted, separately expiring token. This
 * hook is what asks for the next one, via the `onNeedNextMinute` callback the
 * live client invokes shortly before the current minute lapses. The server
 * takes it from the member's free Pass minutes while there are any, then from
 * the wallet; returning null there ends the call, which is how an empty wallet
 * surfaces: as the server declining to grant the next minute.
 *
 * Voice call is an Aroha Pass benefit. The server decides that, not this hook:
 * a start refused with PASS_REQUIRED opens the Pass lock instead of an error.
 */
export function useVoiceCall(locale: string): VoiceCall {
  const { t } = useTranslation();
  const { user, refresh } = useAuth();
  const feature = useFeature("paid.voiceChat");

  const [showConsent, setShowConsent] = useState(false);
  const [showPassLock, setShowPassLock] = useState(false);
  const [state, setState] = useState<VoiceCallState>("idle");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);
  /**
   * What the latest grant said about the minute now running. `allowanceKnown`
   * is false against a server from before voice became a Pass benefit: its
   * `minutesRemaining` counted down a fixed 3-minute ceiling, so "3 minutes
   * left" there meant the start of every call, not a low wallet.
   */
  const [minute, setMinute] = useState<{ free: boolean; allowanceKnown: boolean; pricePaise: number } | null>(null);

  const sessionRef = useRef<GeminiLiveSession | null>(null);
  const grantRef = useRef<VoiceGrant | null>(null);
  const ringRef = useRef<HTMLAudioElement | null>(null);
  /**
   * Whether this call ever got past the handshake into an actual conversation
   * (state reached "listening" or "speaking" at least once). Reset per call in
   * `begin`, not per renewed minute — this reports on the call as a whole, so
   * it answers "did the user get anything for what they paid", which is what
   * the server's grace-window refund is checking against.
   */
  const hasConnectedRef = useRef(false);

  const active = state !== "idle" && state !== "closed";
  const inConversation = state === "listening" || state === "speaking";

  const noteGrant = useCallback((grant: VoiceGrant) => {
    grantRef.current = grant;
    setMinute({
      free: grant.freeMinute === true,
      allowanceKnown: grant.freeMinutesLeft !== undefined,
      pricePaise: grant.pricePerMinutePaise,
    });
  }, []);

  const teardown = useCallback(async () => {
    // Both refs are cleared before the first await. Stopping the session fires
    // its `onClosed`, which calls back in here when a grant is still held (see
    // `begin`); taking the grant first is what makes that second entry a no-op
    // instead of a second /end that would arrive without the transcript.
    const session = sessionRef.current;
    const grant = grantRef.current;
    sessionRef.current = null;
    grantRef.current = null;

    // Read while `session` is still in hand; the buffer holds no socket
    // reference, so this does not depend on stop()'s internals staying inert.
    const transcript = session?.getTranscript();
    await session?.stop();
    void stopBackgroundCall();

    if (grant) {
      // Best-effort: each minute was settled when it was granted, so a failure
      // here costs nothing but a stale `active` row. `connected` tells the
      // server whether that minute ever became a working call — see
      // CONNECT_GRACE_MS in voice.service.ts for what happens with false.
      // `transcript` rides along so the server can save the call to chat
      // history and mine it for facts, same as text chat.
      await endVoiceSession(grant.voiceSessionId, hasConnectedRef.current, transcript).catch(() => {});
    }

    setState("idle");
    setSecondsLeft(0);
    setMinute(null);
    // Minutes are charged as they are granted, so the balance in the top bar is
    // stale the moment a call ends.
    refresh().catch(() => {});
  }, [refresh]);

  /**
   * Time left in the whole call: what remains of the current minute, plus the
   * minutes the server says can still follow (free Pass minutes and what the
   * wallet covers). Derived from the grant rather than counted up from a start
   * time, so it stays honest if a renewal is late.
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

  // Audible feedback while the socket handshake is in flight — the call has
  // no other sound of its own until the model's first reply arrives, and dead
  // air there reads as broken rather than "connecting". Stops the instant
  // `state` leaves "connecting", whether that's success or failure.
  useEffect(() => {
    if (state !== "connecting") return;
    const audio = new Audio("/sounds/ringing.mp3");
    audio.loop = true;
    ringRef.current = audio;
    void audio.play().catch(() => {});
    return () => {
      audio.pause();
      ringRef.current = null;
    };
  }, [state]);

  // A call must not outlive the screen. Without this, navigating away leaves
  // the mic open and the minute loop buying time nobody is listening to.
  useEffect(() => {
    return () => {
      const transcript = sessionRef.current?.getTranscript();
      void sessionRef.current?.stop();
      void stopBackgroundCall();
      const grant = grantRef.current;
      if (grant) {
        void endVoiceSession(grant.voiceSessionId, hasConnectedRef.current, transcript).catch(() => {});
      }
    };
  }, []);

  // Minimizing the app does NOT end the call (owner's rule, 2026-10-10; this
  // replaced an earlier version that hung up on `visibilitychange`). What ends a
  // call is the wallet running out, the user hanging up, or ten seconds of
  // silence (gemini-live-client.ts) — and the silence rule is also what stops a
  // background call whose microphone the phone has silenced, or one left
  // running by mistake, from taking a minute from the wallet every minute.
  //
  // Keeping the microphone alive in the background on Android is the foreground
  // service started in `begin` below (lib/voice/background-call.ts).

  const begin = useCallback(
    async (firstGrant: VoiceGrant) => {
      noteGrant(firstGrant);
      hasConnectedRef.current = false;

      const session = new GeminiLiveSession({
        onStateChange: (s) => {
          if (s === "listening" || s === "speaking") hasConnectedRef.current = true;
          setState(s);
        },
        // `onNeedNextMinute` below already stores the new grant (with the full
        // server payload); this just snaps the countdown to it immediately
        // rather than waiting up to a second for the next tick.
        onMinuteGranted: () => recomputeSecondsLeft(),
        onError: (err) => {
          // `err.message` carries the raw close code and is for the console
          // (the client logs it). The reader gets a sentence in their language.
          const kind = err instanceof VoiceCallError ? err.kind : null;
          setError(
            kind === "microphone"
              ? t("aiChatPage.voiceCallMicError")
              : kind === "dropped"
                ? t("aiChatPage.voiceCallDropped")
                : kind === "idle"
                  ? t("aiChatPage.voiceCallIdle")
                  : t("aiChatPage.voiceChatError"),
          );
          void teardown();
        },
        onClosed: () => {
          // The client closes itself when the server declines the next minute.
          // A grant still held here means nobody has told the server the call
          // is over or handed it the transcript yet — `teardown` does both.
          // (When `teardown` is what stopped the session, the grant is already
          // taken and this only settles the state.)
          if (grantRef.current) void teardown();
          else setState("idle");
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
            noteGrant(next);
            return next;
          } catch (err) {
            // The Pass ended while they were talking: same lock as at the start.
            if (refusedWith(err, "PASS_REQUIRED")) {
              setShowPassLock(true);
              return null;
            }
            // 409 is the server declining the next minute: the wallet cannot
            // pay for it, or the call hit the safety ceiling. Neither is
            // something the user did wrong, so the call ends with a plain
            // sentence rather than a failure.
            if (err instanceof SwarmApiError && err.status === 409) {
              setError(
                /LIMIT/i.test(err.message)
                  ? t("aiChatPage.voiceChatLimitReached")
                  : t("aiChatPage.voiceCallOutOfCredit"),
              );
              return null;
            }
            throw err;
          }
        },
      });

      sessionRef.current = session;
      await session.start(firstGrant);

      // After `start`, not before: Android refuses a microphone foreground
      // service until the microphone is allowed, and on a first call that is
      // decided inside `start` (the permission prompt). A failed start has
      // already ended the call by here, so there is nothing to keep alive.
      if (sessionRef.current === session) {
        void startBackgroundCall(t("aiChatPage.voiceCallOngoing"), t("aiChatPage.voiceCallOngoingBody"));
      }
    },
    [locale, noteGrant, recomputeSecondsLeft, t, teardown],
  );

  const handleStart = useCallback(async () => {
    setError(null);
    setState("connecting");
    try {
      const grant = await startVoiceSession(locale);
      await begin(grant);
    } catch (err) {
      setState("idle");
      if (refusedWith(err, "PASS_REQUIRED")) {
        setShowPassLock(true);
        return;
      }
      if (refusedWith(err, "VOICE_CONSENT_REQUIRED")) {
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

  const acceptConsent = useCallback(async () => {
    await grantVoiceConsent();
    await refresh().catch(() => {});
    setShowConsent(false);
    await handleStart();
  }, [handleStart, refresh]);

  return {
    // Both gates, exactly as the server enforces them: the admin flag, and —
    // for rendering only — nothing else. Neither consent nor the Pass is
    // checked here; a user without them still sees the call icon, and tapping
    // it opens the consent sheet or the Pass lock. Hiding it from them instead
    // would leave no way to ever grant consent or find out it is in the Pass.
    available: feature.enabled && !!user,
    state,
    active,
    secondsLeft,
    lowBalance:
      inConversation && minute?.allowanceKnown === true && secondsLeft > 0 && secondsLeft <= LOW_BALANCE_SECONDS,
    freeMinute: minute?.free === true,
    pricePerMinutePaise: minute?.pricePaise ?? feature.pricePaise ?? DEFAULT_MINUTE_PRICE_PAISE,
    error,
    showConsent,
    showPassLock,
    start: () => void handleStart(),
    stop: () => void teardown(),
    acceptConsent,
    dismissConsent: () => setShowConsent(false),
    dismissPassLock: () => setShowPassLock(false),
    dismissError: () => setError(null),
  };
}
