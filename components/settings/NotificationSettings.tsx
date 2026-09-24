"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Orbit, CalendarDays, Gift, BellOff } from "lucide-react";
import ListRow from "@/components/ui/ListRow";
import Switch from "@/components/ui/Switch";
import { useAuth } from "@/providers/auth-provider";
import { api, type NotificationPrefs, type QuietHours } from "@/lib/api";
import { track } from "@/lib/analytics";

type Category = "transitAlerts" | "muhurta" | "marketing";

const QUIET_HOURS: QuietHours = { start: "22:00", end: "07:00" };

const ROWS: { category: Category; labelKey: string; icon: ReactNode }[] = [
  { category: "transitAlerts", labelKey: "settings.notifPlanetAlerts", icon: <Orbit size={16} /> },
  { category: "muhurta", labelKey: "settings.notifFestivals", icon: <CalendarDays size={16} /> },
  { category: "marketing", labelKey: "settings.notifOffers", icon: <Gift size={16} /> },
];

/**
 * Settings → Notifications. The backend (lib/notifications/notification-prefs.ts)
 * checks these before every optional push; things the user asked for (a ready
 * report, a support reply) are never gated. Each toggle saves immediately.
 */
export default function NotificationSettings() {
  const { t } = useTranslation();
  const { user, refresh } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPrefs>(user?.notificationPrefs ?? {});
  const [quietHours, setQuietHours] = useState<QuietHours | null>(user?.quietHours ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  // Re-sync when the signed-in user (or their saved settings) changes underneath us.
  useEffect(() => {
    setPrefs(user?.notificationPrefs ?? {});
    setQuietHours(user?.quietHours ?? null);
  }, [user?.notificationPrefs, user?.quietHours]);

  const save = async (body: { notificationPrefs?: NotificationPrefs; quietHours?: QuietHours | null }, rollback: () => void) => {
    setSaving(true);
    setError(false);
    try {
      await api.updateMe(body);
      await refresh();
    } catch {
      rollback();
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (category: Category, on: boolean) => {
    const previous = prefs;
    // The backend stores the whole object — merge so other categories keep their value.
    const next: NotificationPrefs = { ...prefs, [category]: { ...prefs[category], push: on } };
    setPrefs(next);
    track("notification_settings_changed", { setting: category, on });
    void save({ notificationPrefs: next }, () => setPrefs(previous));
  };

  const toggleQuietHours = (on: boolean) => {
    const previous = quietHours;
    const next = on ? QUIET_HOURS : null;
    setQuietHours(next);
    track("notification_settings_changed", { setting: "quietHours", on });
    void save({ quietHours: next }, () => setQuietHours(previous));
  };

  return (
    <div className="space-y-2.5 mb-6">
      {ROWS.map(({ category, labelKey, icon }) => {
        const on = prefs[category]?.push !== false;
        return (
          <ListRow
            key={category}
            icon={icon}
            label={t(labelKey)}
            right={
              <Switch checked={on} disabled={saving} onChange={(next) => toggleCategory(category, next)} aria-label={t(labelKey)} />
            }
          />
        );
      })}
      <ListRow
        icon={<BellOff size={16} />}
        label={t("settings.notifQuietHours")}
        subtitle={t("settings.notifQuietHoursSub")}
        right={
          <Switch
            checked={quietHours !== null}
            disabled={saving}
            onChange={toggleQuietHours}
            aria-label={t("settings.notifQuietHours")}
          />
        }
      />
      <p className="text-[11px] text-muted leading-relaxed px-1">{t("settings.notifFootnote")}</p>
      {error && <p className="text-xs text-red-400 px-1">{t("settings.notifSaveError")}</p>}
    </div>
  );
}
