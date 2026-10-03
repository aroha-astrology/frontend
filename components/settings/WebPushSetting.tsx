"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bell, Check, Loader2 } from "lucide-react";
import ListRow from "@/components/ui/ListRow";
import { useAuth } from "@/providers/auth-provider";
import { track } from "@/lib/analytics";
import type { WebPushState } from "@/lib/web-push";

/**
 * Settings → Notifications, browser only: whether THIS browser gets pushes.
 * Renders nothing inside the Android app (its permission lives in system
 * settings) or in a browser that cannot receive web push.
 */
export default function WebPushSetting() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [state, setState] = useState<WebPushState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (Capacitor.isNativePlatform()) return;
        const { getWebPushState } = await import("@/lib/web-push");
        const next = await getWebPushState();
        if (!cancelled) setState(next);
      } catch {
        // Stays null: nothing to show.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!state || state === "unsupported") return null;

  const enable = async () => {
    setBusy(true);
    try {
      const { requestWebPushPermission, getWebPushState } = await import("@/lib/web-push");
      const outcome = await requestWebPushPermission(user?.id ?? "");
      track("notification_settings_changed", { setting: "webPush", on: outcome === "granted" });
      setState(await getWebPushState());
    } finally {
      setBusy(false);
    }
  };

  const subtitle =
    state === "denied"
      ? t("permissions.webPushBlocked")
      : state === "needs-install"
        ? t("permissions.webPushInstall")
        : undefined;

  const right =
    state === "granted" ? (
      <span
        aria-label={t("permissions.webPushOn")}
        title={t("permissions.webPushOn")}
        className="shrink-0 flex items-center justify-center h-7 w-7 rounded-full border border-gold/40 bg-gold/10 text-gold"
      >
        <Check size={14} />
      </span>
    ) : state === "default" ? (
      busy ? (
        <span className="shrink-0 px-3 py-1.5 text-muted">
          <Loader2 className="animate-spin" size={14} />
        </span>
      ) : (
        <span className="shrink-0 rounded-full px-3 py-1.5 text-[10px] font-semibold whitespace-nowrap bg-gradient-to-r from-yellow-400 to-yellow-600 text-black">
          {t("permissions.enable")}
        </span>
      )
    ) : undefined;

  return (
    <ListRow
      icon={<Bell size={16} />}
      label={t("permissions.webPushTitle")}
      subtitle={subtitle}
      onClick={state === "default" && !busy ? enable : undefined}
      right={right}
    />
  );
}
