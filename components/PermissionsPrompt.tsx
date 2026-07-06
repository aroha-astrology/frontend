"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { MapPin, Bell } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { useGeolocation } from "@/hooks/useGeolocation";
import { api } from "@/lib/api";

const ASKED_KEY = "aroha:permissionsAsked";

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
  const geo = useGeolocation();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user?.profileCompletedAt) return;
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(ASKED_KEY)) return;

    let cancelled = false;
    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!cancelled && Capacitor.isNativePlatform()) setVisible(true);
      } catch {
        // @capacitor/core not resolvable (e.g. plain web build) — never show.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.profileCompletedAt]);

  const dismiss = () => {
    window.localStorage.setItem(ASKED_KEY, "1");
    setVisible(false);
  };

  const enable = async () => {
    setBusy(true);
    try {
      geo.request();

      const { Capacitor } = await import("@capacitor/core");
      const { FirebaseMessaging } = await import("@capacitor-firebase/messaging");
      const platform = Capacitor.getPlatform();

      const perm = await FirebaseMessaging.requestPermissions();
      if (perm.receive === "granted") {
        const { token } = await FirebaseMessaging.getToken();
        if (token && (platform === "android" || platform === "ios")) {
          await api.registerDeviceToken({ token, platform });
        }
      }
    } catch {
      // Best-effort — a failure here just means the user keeps using the app
      // without push/location, same as declining outright.
    } finally {
      dismiss();
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
