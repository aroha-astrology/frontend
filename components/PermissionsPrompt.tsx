"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { MapPin, Bell } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { usePermissionsPrompt } from "@/providers/permissions-prompt-provider";
import { useDismissOnBackPress } from "@/providers/back-handler-provider";
import { useGeolocation } from "@/hooks/useGeolocation";
import { api } from "@/lib/api";
import { getDeviceId, markPushRefreshed } from "@/lib/device-id";

// v3: re-asks at most once every RE_ASK_AFTER_DAYS instead of permanently
// suppressing after the first ask. v2's ASKED_KEY blocked this prompt from
// ever running again for anyone who tapped "Not now" or had a technical
// failure — meaning a user who later wanted push had no way back in short of
// reinstalling. PushNotificationListener.tsx now handles the actual token
// self-healing (silent re-register on every launch when already granted);
// this component is only the periodic ASK for users who aren't granted yet.
const ASKED_AT_KEY = "aroha:permissionsAskedAt:v3";
const DENIED_KEY = "aroha:permissionsDenied:v3";
const RE_ASK_AFTER_DAYS = 30;

/**
 * One-time-per-cycle "enable location + notifications" prompt, shown after a
 * signed-in, onboarded user's first app launch (and again every
 * RE_ASK_AFTER_DAYS if still not granted). Native-only — gated on
 * Capacitor.isNativePlatform() so it never renders in a plain browser tab.
 */
export default function PermissionsPrompt() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { markResolved } = usePermissionsPrompt();
  const geo = useGeolocation();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deniedState, setDeniedState] = useState(false);
  const [platform, setPlatform] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;
    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (cancelled) return;
        if (!Capacitor.isNativePlatform()) {
          markResolved();
          return;
        }
        if (!user?.profileCompletedAt) return;
        setPlatform(Capacitor.getPlatform());

        // Ground truth beats our stored guess: if the OS says granted (e.g.
        // the user enabled it from system Settings directly), never show —
        // PushNotificationListener.tsx's silent refresh already covers
        // keeping the token fresh from here on.
        const { FirebaseMessaging } = await import("@capacitor-firebase/messaging");
        const current = await FirebaseMessaging.checkPermissions();
        if (current.receive === "granted") {
          markResolved();
          return;
        }

        const askedAt = window.localStorage.getItem(ASKED_AT_KEY);
        const daysSinceAsk = askedAt ? (Date.now() - Number(askedAt)) / 86_400_000 : Infinity;
        if (askedAt && daysSinceAsk < RE_ASK_AFTER_DAYS) {
          markResolved();
          return;
        }

        setDeniedState(window.localStorage.getItem(DENIED_KEY) === "1");
        setVisible(true);
      } catch {
        // @capacitor/core not resolvable (e.g. plain web build) — never show.
        if (!cancelled) markResolved();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.profileCompletedAt, markResolved]);

  /** Records a real decision (asked, and whether the OS denial is now known) so the next ask waits the full RE_ASK_AFTER_DAYS. */
  const stampAsked = (denied: boolean) => {
    window.localStorage.setItem(ASKED_AT_KEY, String(Date.now()));
    if (denied) window.localStorage.setItem(DENIED_KEY, "1");
    else window.localStorage.removeItem(DENIED_KEY);
    setVisible(false);
    markResolved();
  };

  const dismiss = () => stampAsked(deniedState);

  useDismissOnBackPress(visible, dismiss);

  // Apple-documented, plugin-free URL scheme that always opens the CURRENT
  // app's settings page — no bundle id required. There is no Android
  // equivalent without a native settings plugin, and this app's Android
  // package id is inconsistent across checkouts (see the
  // aroha-firebase-project-mismatch memory) — safer to give Android users
  // text instructions than to guess a package id and open the wrong place.
  const openSettings = () => {
    window.location.href = "app-settings:";
    stampAsked(true);
  };

  const enable = async () => {
    setBusy(true);
    // Only a real, permanent decision (an explicit grant or an explicit OS-level
    // decline) suppresses the prompt for the full RE_ASK_AFTER_DAYS window. A
    // technical failure along the way (plugin not resolvable, getToken()
    // erroring, the register-token API call failing) is NOT a user decision —
    // don't stamp ASKED_AT_KEY for those, so the prompt reappears next launch.
    let permanent = false;
    let deniedNow = false;
    try {
      // Request notification permission (a native Android runtime-permission
      // dialog) fully to completion before touching geolocation. Android can
      // only have one requestPermissions() call in flight per Activity at a
      // time — firing geo.request() first (its getCurrentPosition() call
      // triggers the WebView's own native location-permission dialog) used
      // to race with FirebaseMessaging.requestPermissions() below, which
      // made Android silently reject the second call ("Can request only one
      // set of permissions at a time"), so the notification dialog never
      // appeared and requestPermissions() resolved to "prompt" instead of a
      // real answer.
      let Capacitor: typeof import("@capacitor/core").Capacitor;
      let FirebaseMessaging: typeof import("@capacitor-firebase/messaging").FirebaseMessaging;
      try {
        ({ Capacitor } = await import("@capacitor/core"));
        ({ FirebaseMessaging } = await import("@capacitor-firebase/messaging"));
      } catch (err) {
        console.error("[PermissionsPrompt] plugin import failed", err);
        return;
      }
      const currentPlatform = Capacitor.getPlatform();

      let perm;
      try {
        perm = await FirebaseMessaging.requestPermissions();
        console.log("[PermissionsPrompt] requestPermissions ->", perm.receive);
      } catch (err) {
        console.error("[PermissionsPrompt] requestPermissions() threw", err);
        return;
      }

      if (perm.receive === "granted") {
        try {
          const { token } = await FirebaseMessaging.getToken();
          console.log("[PermissionsPrompt] getToken ->", token ? `${token.slice(0, 12)}...` : "(empty)");
          if (token && (currentPlatform === "android" || currentPlatform === "ios")) {
            await api.registerDeviceToken({ token, platform: currentPlatform, deviceId: getDeviceId() });
            console.log("[PermissionsPrompt] registerDeviceToken -> ok");
            markPushRefreshed(); // Just registered — don't let the next launch re-fetch the token.
            permanent = true; // Reached full success — a real, permanent decision.
          }
        } catch (err) {
          console.error("[PermissionsPrompt] getToken/registerDeviceToken failed", err);
          // Leave `permanent` false — technical failure, not a user decision, so retry next launch.
        }
      } else if (perm.receive === "denied") {
        // Explicit OS-level decline — respect it, don't re-request. It still
        // gets re-surfaced (as the settings-redirect variant) in
        // RE_ASK_AFTER_DAYS, since a user can change their mind via Settings.
        permanent = true;
        deniedNow = true;
      }
      // Any other status (e.g. "prompt"/"prompt-with-rationale") falls through
      // with permanent=false, so this counts as inconclusive, not declined.

      // Only now, once the notification permission dialog has fully
      // resolved, request location — see the note above about why these
      // can't run concurrently.
      geo.request();
    } catch (err) {
      console.error("[PermissionsPrompt] enable() failed", err);
    } finally {
      if (permanent) {
        stampAsked(deniedNow);
      } else {
        setVisible(false); // hide for this session, but allow a retry next launch
        markResolved(); // still unblocks the tour etc. for this session
      }
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 pb-4 sm:pb-0"
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 26 }}
            className="w-full max-w-sm rounded-3xl border border-gold/20 bg-card p-5 shadow-2xl"
          >
            {deniedState ? (
              <>
                <h2 className="text-lg font-display text-foreground mb-1">
                  {t("permissions.reEnableTitle")}
                </h2>
                <p className="text-sm text-muted mb-5 leading-relaxed">{t("permissions.reEnableBody")}</p>

                <div className="flex gap-3">
                  <button
                    onClick={dismiss}
                    className="flex-1 py-3 rounded-xl border border-gold/20 text-foreground text-sm font-medium transition-opacity"
                  >
                    {t("permissions.notNow")}
                  </button>
                  {platform === "ios" && (
                    <button
                      onClick={openSettings}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black text-sm font-bold transition-opacity"
                    >
                      {t("permissions.openSettings")}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <h2 className="text-lg font-display text-foreground mb-1">
                  {t("permissions.title")}
                </h2>
                <p className="text-sm text-muted mb-4 leading-relaxed">{t("permissions.subtitle")}</p>

                <div className="space-y-3 mb-5">
                  <div className="flex items-start gap-3">
                    <span className="text-gold mt-0.5">
                      <MapPin size={16} />
                    </span>
                    <p className="text-xs text-foreground/90 leading-relaxed">
                      {t("permissions.locationReason")}
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-gold mt-0.5">
                      <Bell size={16} />
                    </span>
                    <p className="text-xs text-foreground/90 leading-relaxed">
                      {t("permissions.notificationReason")}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={dismiss}
                    disabled={busy}
                    className="flex-1 py-3 rounded-xl border border-gold/20 text-foreground text-sm font-medium disabled:opacity-50 transition-opacity"
                  >
                    {t("permissions.notNow")}
                  </button>
                  <button
                    onClick={enable}
                    disabled={busy}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black text-sm font-bold disabled:opacity-50 transition-opacity"
                  >
                    {t("permissions.enable")}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
