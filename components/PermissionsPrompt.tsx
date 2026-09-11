"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { MapPin, Bell, Gift } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { usePermissionsPrompt } from "@/providers/permissions-prompt-provider";
import { useDismissOnBackPress } from "@/providers/back-handler-provider";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useLocationRewardClaim } from "@/hooks/useLocationRewardClaim";
import { useFeature } from "@/hooks/useFeature";
import { requestPushPermission } from "@/lib/push-permission";
import { formatRupees } from "@/lib/format";
import {
  LOCATION_REWARD_REASON,
  NOTIFICATIONS_REWARD_REASON,
  PERMISSION_REWARD_FALLBACK_PAISE,
} from "@/lib/rewards";

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
  const notifFeature = useFeature("rewards.notificationsGrant");
  const locationFeature = useFeature("rewards.locationGrant");

  // Pays the location half once the OS reports the grant — the notification
  // half is credited server-side when the token registers. Without this, the
  // banner below would promise money the modal never delivers.
  useLocationRewardClaim(geo.status);

  // What is still unclaimed and actually payable, so the banner never quotes an
  // amount this user cannot get: a disabled flag contributes nothing, and iOS
  // contributes no location half (it cannot raise the prompt at all — no
  // NSLocationWhenInUseUsageDescription in the native Info.plist).
  const unclaimed = (reason: string) => !(user?.claimedCampaigns?.includes(reason) ?? false);
  const rewardPaise =
    (notifFeature.enabled && unclaimed(NOTIFICATIONS_REWARD_REASON)
      ? (notifFeature.pricePaise ?? PERMISSION_REWARD_FALLBACK_PAISE)
      : 0) +
    (locationFeature.enabled && platform !== "ios" && unclaimed(LOCATION_REWARD_REASON)
      ? (locationFeature.pricePaise ?? PERMISSION_REWARD_FALLBACK_PAISE)
      : 0);

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
      // Runs the notification dialog fully to completion before geolocation is
      // touched — see requestPushPermission for why they cannot overlap on
      // Android. "inconclusive" (a soft OS answer, or any technical failure)
      // leaves `permanent` false so a fresh attempt runs next launch; only a
      // real grant or a real OS decline is recorded as a decision.
      const outcome = await requestPushPermission(user?.id ?? "");
      permanent = outcome !== "inconclusive";
      // An explicit decline still gets re-surfaced (as the settings-redirect
      // variant) on every subsequent login, since a user can change their mind.
      deniedNow = outcome === "denied";

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

                {rewardPaise > 0 && (
                  <div className="flex items-center gap-2 mb-4 rounded-xl border border-gold/30 bg-gold/10 px-3 py-2.5">
                    <span className="text-gold shrink-0">
                      <Gift size={16} />
                    </span>
                    <p className="text-xs text-gold leading-relaxed">
                      {t("permissions.rewardBanner", { amount: formatRupees(rewardPaise) })}
                    </p>
                  </div>
                )}

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
                    {rewardPaise > 0
                      ? t("permissions.claimCta", { amount: formatRupees(rewardPaise) })
                      : t("permissions.enable")}
                  </button>
                </div>

                {rewardPaise > 0 && (
                  <Link
                    href="/rewards"
                    onClick={dismiss}
                    className="block text-center text-xs text-muted hover:text-gold mt-3 transition-colors"
                  >
                    {t("permissions.seeRewards")}
                  </Link>
                )}
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
