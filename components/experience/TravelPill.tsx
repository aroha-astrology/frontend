"use client";

import { useState } from "react";
import { Plane } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cityFromZone } from "@/lib/sky";
import { useSkyContext } from "@/hooks/useSkyContext";

/**
 * "You're in New York. Show times for here, or keep Mumbai?" Shown only while the device is away
 * from home and the user has not answered for this zone (switch experience.travelPill). Following the
 * device leaves a small note instead, so the user can see which clock the times are on.
 */
export default function TravelPill({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const { ctx, travel, deviceTz, followDevice, keepHome } = useSkyContext();
  const [busy, setBusy] = useState(false);

  if (!ctx || (travel.kind !== "ask" && travel.kind !== "away")) return null;

  const here = cityFromZone(deviceTz);

  if (travel.kind === "away") {
    return (
      <p
        data-testid="travel-note"
        className={`flex items-center gap-1.5 text-[11px] text-muted ${className}`}
      >
        <Plane size={11} className="text-gold" />
        {t("travel.showingFor", { city: here })}
      </p>
    );
  }

  const home = ctx.homeLocation?.name ?? cityFromZone(ctx.homeTimezone ?? deviceTz);

  async function run(action: () => Promise<boolean>) {
    setBusy(true);
    await action();
    setBusy(false);
  }

  return (
    <div
      data-testid="travel-pill"
      role="region"
      aria-label={t("travel.pill.title", { city: here })}
      className={`rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 ${className}`}
    >
      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Plane size={14} className="text-gold" />
        {t("travel.pill.title", { city: here })}
      </p>
      <p className="mt-1 text-xs text-muted">{t("travel.pill.body", { home })}</p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          data-testid="travel-sync"
          disabled={busy}
          onClick={() => run(followDevice)}
          className="flex-1 rounded-xl bg-gold py-2 text-xs font-semibold text-black disabled:opacity-50"
        >
          {t("travel.pill.use", { city: here })}
        </button>
        <button
          type="button"
          data-testid="travel-keep"
          disabled={busy}
          onClick={() => run(keepHome)}
          className="flex-1 rounded-xl border border-gold/40 py-2 text-xs font-semibold text-gold disabled:opacity-50"
        >
          {t("travel.pill.keep", { home })}
        </button>
      </div>
    </div>
  );
}
