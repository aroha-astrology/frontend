"use client";

import { useEffect, useState } from "react";
import { Dot, Sparkles } from "lucide-react";
import ListRow from "@/components/ui/ListRow";
import Switch from "@/components/ui/Switch";
import { api } from "@/lib/api";
import { HOOKS } from "@/lib/hooks-copy";
import { resolveFeature } from "@/hooks/useFeature";
import { useAuth } from "@/providers/auth-provider";

/**
 * Settings -> Notifications: the daily-return hooks. One master switch for the whole kind (saved with
 * the other notification categories) and one switch per hook that is on for this reader. Nothing
 * shows while no hook is switched on. A reader gets at most three hook pushes a day, and none in
 * their quiet hours.
 */
export default function HookPushSettings({
  masterOn,
  disabled,
  onMaster,
}: {
  masterOn: boolean;
  disabled: boolean;
  onMaster: (on: boolean) => void;
}) {
  const { user } = useAuth();
  const mine = HOOKS.filter((h) => resolveFeature(user?.features, h.feature, { failClosed: true }).enabled);
  const [off, setOff] = useState<string[]>([]);

  useEffect(() => {
    if (mine.length === 0) return;
    let cancelled = false;
    api
      .hookPrefs()
      .then((p) => !cancelled && setOff(p.off))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mine.length]);

  if (mine.length === 0) return null;

  const toggle = (key: string, on: boolean) => {
    const previous = off;
    setOff(on ? off.filter((k) => k !== key) : [...off, key]);
    api.hookSetPref(key, on).then(
      (p) => setOff(p.off),
      () => setOff(previous),
    );
  };

  return (
    <div className="space-y-2.5" data-testid="hook-push-settings">
      <ListRow
        icon={<Sparkles size={16} />}
        label="Daily nudges"
        subtitle="At most three a day, never in your quiet hours"
        right={<Switch checked={masterOn} disabled={disabled} onChange={onMaster} aria-label="Daily nudges" />}
      />
      {masterOn &&
        mine.map((h) => (
          <ListRow
            key={h.key}
            icon={<Dot size={16} />}
            label={h.title}
            right={<Switch checked={!off.includes(h.key)} onChange={(on) => toggle(h.key, on)} aria-label={`${h.title} nudges`} />}
          />
        ))}
    </div>
  );
}
