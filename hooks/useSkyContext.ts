"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { deviceTimeZone } from "@/lib/calendar-format";
import { travelState, type SkyContext, type SkyContextUpdate, type TravelState } from "@/lib/sky";
import { useNewFeature } from "@/hooks/useFeature";
import { useAuth } from "@/providers/auth-provider";

/**
 * The user's sky context: home place, travel mode, NRI mode (switches `experience.travelPill` and
 * `experience.nriMode`). `ctx` is null while both switches are off, while loading, or if the request
 * fails: nothing about travel or NRI shows then, and Panchang behaves as it always has.
 *
 * One answer is shared by everything that asks (Home pill, Panchang, Settings) so they agree after
 * a change. Two quiet housekeeping steps run here, once each: the first time the pill is on, the
 * device's zone is remembered as home; and a user who was following the device and is back home
 * returns to home times.
 */

type Listener = (ctx: SkyContext | null) => void;
let shared: { userId: string; ctx: SkyContext } | null = null;
const listeners = new Set<Listener>();

function publish(userId: string, ctx: SkyContext | null) {
  shared = ctx ? { userId, ctx } : null;
  listeners.forEach((l) => l(ctx));
}

export function useSkyContext(): {
  ctx: SkyContext | null;
  deviceTz: string;
  travel: TravelState;
  update: (body: SkyContextUpdate) => Promise<boolean>;
  /** Follow the device while away. */
  followDevice: () => Promise<boolean>;
  /** Keep home times while away (asked again in a different zone). */
  keepHome: () => Promise<boolean>;
} {
  const { user } = useAuth();
  const pill = useNewFeature("experience.travelPill").enabled;
  const nri = useNewFeature("experience.nriMode").enabled;
  const userId = user?.id;
  const on = pill || nri;
  const [ctx, setCtx] = useState<SkyContext | null>(shared && shared.userId === userId ? shared.ctx : null);
  const [deviceTz] = useState(deviceTimeZone);

  useEffect(() => {
    listeners.add(setCtx);
    return () => {
      listeners.delete(setCtx);
    };
  }, []);

  useEffect(() => {
    if (!on || !userId) {
      setCtx(null);
      return;
    }
    if (shared && shared.userId === userId) {
      setCtx(shared.ctx);
      return;
    }
    let cancelled = false;
    api
      .skyContext()
      .then((res) => {
        if (!cancelled) publish(userId, res);
      })
      .catch(() => {
        if (!cancelled) setCtx(null);
      });
    return () => {
      cancelled = true;
    };
  }, [on, userId]);

  const update = useCallback(
    async (body: SkyContextUpdate): Promise<boolean> => {
      if (!userId) return false;
      try {
        publish(userId, await api.setSkyContext(body));
        return true;
      } catch {
        return false;
      }
    },
    [userId],
  );

  const travel: TravelState = ctx ? travelState(ctx, deviceTz) : { kind: "none" };

  // Quiet housekeeping, keyed on the state's kind so each runs once per change.
  useEffect(() => {
    if (travel.kind === "adopt-home") void update({ homeTimezone: deviceTz });
    if (travel.kind === "home-again") void update({ skyMode: "HOME" });
    // `update` and `deviceTz` are stable for a given user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [travel.kind]);

  const followDevice = useCallback(() => update({ skyMode: "TRAVEL_SYNCED" }), [update]);
  const keepHome = useCallback(
    () => update({ skyMode: "TRAVEL_DISMISSED", skyDismissedTz: deviceTz }),
    [update, deviceTz],
  );

  return { ctx, deviceTz, travel, update, followDevice, keepHome };
}
