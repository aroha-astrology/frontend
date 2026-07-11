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

// v2: bumped because a bug (fixed alongside this) could mark the prompt as
// permanently dismissed even when getToken()/registerDeviceToken failed —
// this resets the gate so anyone caught by that gets a fresh retry.
const ASKED_KEY = "aroha:permissionsAsked:v2";

/**
 * One-time "enable location + notifications" prompt, shown after a
 * signed-in, onboarded user's first app launch. Native-only (location via
 * the browser API still works on web, but push notifications need the
 * native Capacitor bridge, and there's no value asking web users for a
 * native-only permission) — gated on Capacitor.isNativePlatform() so it
 * never renders in a plain browser tab.
 */
export default function PermissionsPrompt() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { markResolved } = usePermissionsPrompt();
  const geo = useGeolocation();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  // Determines up front (independent of profile-completion, which only
  // gates whether we actually SHOW the prompt) whether this prompt applies
  // at all this session, so other first-launch UI (the home tour) knows
  // whether it needs to wait on this or can proceed immediately.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(ASKED_KEY)) {
      markResolved();
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (cancelled) return;
        if (!Capacitor.isNativePlatform()) {
          markResolved();
          return;
        }
        if (user?.profileCompletedAt) setVisible(true);
      } catch {
        // @capacitor/core not resolvable (e.g. plain web build) — never show.
        if (!cancelled) markResolved();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.profileCompletedAt, markResolved]);

  const dismiss = () => {
    window.localStorage.setItem(ASKED_KEY, "1");
    setVisible(false);
    markResolved();
  };

  // Hardware back press while the prompt is open counts as "not now", same
  // as tapping the dismiss button — it should never fall through to exiting
  // the app or navigating away from underneath the modal.
  useDismissOnBackPress(visible, dismiss);

  const enable = async () => {
    setBusy(true);
    // Only a real, permanent decision (an explicit grant or an explicit OS-level
    // decline) suppresses future prompts. A technical failure along the way
    // (plugin not resolvable, getToken() erroring, the register-token API call
    // failing) is NOT a user decision — don't set the "asked" flag for those,
    // so the prompt reappears next launch instead of silently never retrying.
    let permanent = false;
    try {
      geo.request();

      let Capacitor: typeof import("@capacitor/core").Capacitor;
      let FirebaseMessaging: typeof import("@capacitor-firebase/messaging").FirebaseMessaging;
      try {
        ({ Capacitor } = await import("@capacitor/core"));
        ({ FirebaseMessaging } = await import("@capacitor-firebase/messaging"));
      } catch (err) {
        console.error("[PermissionsPrompt] plugin import failed", err);
        return;
      }
      const platform = Capacitor.getPlatform();

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
          if (token && (platform === "android" || platform === "ios")) {
            await api.registerDeviceToken({ token, platform });
            console.log("[PermissionsPrompt] registerDeviceToken -> ok");
            permanent = true; // Reached full success — a real, permanent decision.
          }
        } catch (err) {
          console.error("[PermissionsPrompt] getToken/registerDeviceToken failed", err);
          // Leave `permanent` false — technical failure, not a user decision, so retry next launch.
        }
      } else if (perm.receive === "denied") {
        // Explicit OS-level decline — respect it, don't re-prompt.
        permanent = true;
      }
      // Any other status (e.g. "prompt"/"prompt-with-rationale") falls through
      // with permanent=false, so this counts as inconclusive, not declined.
    } catch (err) {
      console.error("[PermissionsPrompt] enable() failed", err);
    } finally {
      if (permanent) {
        dismiss();
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
