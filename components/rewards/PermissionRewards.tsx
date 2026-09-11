"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bell, Check, Loader2, MapPin } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { useFeature } from "@/hooks/useFeature";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useLocationRewardClaim } from "@/hooks/useLocationRewardClaim";
import { requestPushPermission } from "@/lib/push-permission";
import { formatRupees } from "@/lib/format";
import {
  LOCATION_REWARD_REASON,
  NOTIFICATIONS_REWARD_REASON,
  PERMISSION_REWARD_FALLBACK_PAISE,
} from "@/lib/rewards";
import ListRow from "@/components/ui/ListRow";

/**
 * The two one-time permission rewards, as claimable rows under the daily
 * ladder. The same rewards are also earnable straight from the launch prompt;
 * this page is where a user can do one WITHOUT the other, which the prompt's
 * single combined button can't offer.
 *
 * Claimed state reads `user.claimedCampaigns` rather than the OS permission,
 * because holding the permission is not the same as having been paid — every
 * user who enabled notifications before this shipped holds it already.
 */
export default function PermissionRewards() {
  const { t } = useTranslation();
  const { user, refresh } = useAuth();
  const geo = useGeolocation();
  const notifFeature = useFeature("rewards.notificationsGrant");
  const locationFeature = useFeature("rewards.locationGrant");

  const [platform, setPlatform] = useState<string | null>(null);
  const [busy, setBusy] = useState<"notifications" | "location" | null>(null);

  useLocationRewardClaim(geo.status);

  // Native-only, same gate as PermissionsPrompt: push does not exist in a
  // plain browser tab, so neither reward is earnable there.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (cancelled) return;
        setPlatform(Capacitor.isNativePlatform() ? Capacitor.getPlatform() : null);
      } catch {
        // @capacitor/core not resolvable (plain web build) — stays null, renders nothing.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!platform) return null;

  const claimed = (reason: string) => user?.claimedCampaigns?.includes(reason) ?? false;
  const notifClaimed = claimed(NOTIFICATIONS_REWARD_REASON);
  const locationClaimed = claimed(LOCATION_REWARD_REASON);

  const notifPaise = notifFeature.pricePaise ?? PERMISSION_REWARD_FALLBACK_PAISE;
  const locationPaise = locationFeature.pricePaise ?? PERMISSION_REWARD_FALLBACK_PAISE;

  // iOS cannot raise the location prompt at all: the native Info.plist has no
  // NSLocationWhenInUseUsageDescription, so WKWebView's geolocation silently
  // fails. Honest "coming soon" until a new App Store build ships one.
  const locationBlocked = platform === "ios";

  const enableNotifications = async () => {
    setBusy("notifications");
    try {
      // The backend pays this one when the token registers, so a successful
      // grant means the credit already landed — just re-read the user.
      const outcome = await requestPushPermission(user?.id ?? "");
      if (outcome === "granted") await refresh();
    } finally {
      setBusy(null);
    }
  };

  // Never runs concurrently with the notification request above — the two rows
  // are separate taps, which is exactly what Android's one-request-at-a-time
  // rule needs (see lib/push-permission.ts).
  const enableLocation = () => {
    setBusy("location");
    geo.request();
    setBusy(null);
  };

  const pill = (className: string, label: string) => (
    <span className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-semibold whitespace-nowrap ${className}`}>
      {label}
    </span>
  );

  const rightSlot = (opts: {
    isClaimed: boolean;
    isBlocked: boolean;
    isBusy: boolean;
    amountPaise: number;
  }) => {
    // Icon-only, because a translated "Claimed" is wide enough in Tamil and
    // Telugu to squeeze ListRow's label into an ellipsis — and the label is the
    // part that says what the row is. Same reason the coming-soon pill uses
    // payment.comingSoon ("Soon") rather than the longer reports.comingSoon.
    if (opts.isClaimed)
      return (
        <span
          aria-label={t("rewards.taskClaimed")}
          title={t("rewards.taskClaimed")}
          className="shrink-0 flex items-center justify-center h-7 w-7 rounded-full border border-gold/40 bg-gold/10 text-gold"
        >
          <Check size={14} />
        </span>
      );
    if (opts.isBlocked) return pill("border border-border text-muted", t("rewards.taskSoon"));
    if (opts.isBusy)
      return (
        <span className="shrink-0 px-3 py-1.5 text-muted">
          <Loader2 className="animate-spin" size={14} />
        </span>
      );
    return pill(
      "bg-gradient-to-r from-yellow-400 to-yellow-600 text-black",
      t("rewards.taskClaim", { amount: formatRupees(opts.amountPaise) }),
    );
  };

  const rows: Array<{ show: boolean; node: React.ReactNode }> = [
    {
      show: notifFeature.enabled,
      node: (
        <ListRow
          key="notifications"
          icon={<Bell size={18} />}
          label={t("rewards.notificationsTask")}
          subtitle={t("rewards.notificationsTaskBody")}
          onClick={notifClaimed || busy ? undefined : enableNotifications}
          right={rightSlot({
            isClaimed: notifClaimed,
            isBlocked: false,
            isBusy: busy === "notifications",
            amountPaise: notifPaise,
          })}
        />
      ),
    },
    {
      show: locationFeature.enabled,
      node: (
        <ListRow
          key="location"
          icon={<MapPin size={18} />}
          label={t("rewards.locationTask")}
          subtitle={t("rewards.locationTaskBody")}
          onClick={
            locationClaimed || locationBlocked || busy || geo.status === "requesting"
              ? undefined
              : enableLocation
          }
          right={rightSlot({
            isClaimed: locationClaimed,
            isBlocked: locationBlocked,
            isBusy: busy === "location" || geo.status === "requesting",
            amountPaise: locationPaise,
          })}
        />
      ),
    },
  ];

  const visible = rows.filter((r) => r.show);
  if (visible.length === 0) return null;

  return (
    <section className="space-y-2">
      <p className="text-xs uppercase tracking-wide text-muted px-1">{t("rewards.tasksTitle")}</p>
      {visible.map((r) => r.node)}
      {geo.status === "denied" && !locationClaimed && (
        <p className="text-xs text-red-400 px-1">{t("rewards.locationDenied")}</p>
      )}
    </section>
  );
}
