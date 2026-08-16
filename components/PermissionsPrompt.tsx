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

// v2's ASKED_KEY permanently suppressed this prompt after the first ask —
// meaning a user who tapped "Not now" (or hit a technical failure) had no
// way back in short of reinstalling. v3 changed that to a 30-day re-ask
// cooldown. v4 dropped the cooldown entirely: now re-asks on every login
// where the OS still reports not-granted, at the user's explicit request
// during the Independence Day campaign (push reach was the bottleneck —
// a dead/never-registered token means broadcasts can't reach that user at
// all, and only re-prompting in-app can fix it). PushNotificationListener.tsx
// separately handles silent token self-healing when already granted.
// ASKED_AT_KEY is still stamped as a "last asked" timestamp but no longer
// gates anything.
const ASKED_AT_KEY = "aroha:permissionsAskedAt:v3";
const DENIED_KEY = "aroha:permissionsDenied:v3";

/**
 * "Enable location + notifications" prompt, shown on every signed-in,
 * onboarded user's app launch while the OS still reports the permission as
 * not granted. Native-only — gated on Capacitor.isNativePlatform() so it
 * never renders in a plain browser tab.
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

  /** Records a real decision (asked, and whether the OS denial is now known) — the DENIED_KEY flag picks which UI variant shows on the next login; the prompt itself always re-shows while the OS still reports not-granted. */
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
    // decline) stamps DENIED_KEY, which only affects which UI variant shows next
    // time — the prompt reappears on every login regardless while not granted. A
    // technical failure along the way (plugin not resolvable, getToken()
    // erroring, the register-token API call failing) is NOT a user decision —
    // don't stamp it as one, so a fresh attempt runs next launch.
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
            markPushRefreshed(user?.id ?? ""); // Just registered — don't let the next launch re-fetch the token.
            permanent = true; // Reached full success — a real, permanent decision.
          }
        } catch (err) {
          console.error("[PermissionsPrompt] getToken/registerDeviceToken failed", err);
          // Leave `permanent` false — technical failure, not a user decision, so retry next launch.
        }
      } else if (perm.receive === "denied") {
        // Explicit OS-level decline — respect it, don't re-request via the
        // native permission dialog. It still gets re-surfaced (as the
        // settings-redirect variant) on every subsequent login, since a user
        // can change their mind via Settings.
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
                    disabled={busy}
                    className="flex-1 py-3 rounded-xl border border-gold/20 text-foreground text-sm font-medium disabled:opacity-50 transition-opacity"
                  >
                    {t("permissions.notNow")}
                  </button>
                  {/* Every platform gets a working action here. iOS never re-shows
                      its permission dialog once declined, so Settings is the only
                      route back. Android DOES re-show it after a single decline
                      (only a second one is permanent), so re-requesting is the
                      route back — and this variant used to render no button at
                      all on Android, leaving a user who declined once with no way
                      to ever turn notifications on from inside the app. A
                      permanently-declined Android user simply gets an instant
                      "denied" and this same prompt again next login. */}
                  <button
                    onClick={platform === "ios" ? openSettings : enable}
                    disabled={busy}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black text-sm font-bold disabled:opacity-50 transition-opacity"
                  >
                    {platform === "ios" ? t("permissions.openSettings") : t("permissions.enable")}
                  </button>
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
