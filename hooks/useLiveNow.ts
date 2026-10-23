"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { deviceTimeZone } from "@/lib/calendar-format";
import { LIVE_NOW_REFRESH_MS, resolveNowPlace, type LiveNow, type NowPlace } from "@/lib/live-now";
import { shareWidgetPlace } from "@/lib/live-now-widget";
import { homeOverride } from "@/lib/sky";
import { sharedCoords } from "@/hooks/useDailyStories";
import { useSkyContext } from "@/hooks/useSkyContext";

export type LiveNowState = "loading" | "ready" | "unavailable";

/**
 * What is running right now at the reader's place (switch live.nowBar). The place is the home city
 * while the reader keeps home on a trip, else the position the device already shared (this never opens
 * a location prompt), else Delhi. The answer is cached for 15 minutes on the server, so the bar asks
 * again every 15 minutes and whenever the app comes back to the front.
 *
 * On the Android app the place is also handed to the home-screen widget (build 1.17).
 */
export function useLiveNow(enabled: boolean): { live: LiveNow | null; state: LiveNowState; place: NowPlace | null } {
  const { ctx: skyCtx } = useSkyContext();
  const [deviceTz] = useState(deviceTimeZone);
  const [place, setPlace] = useState<NowPlace | null>(null);
  const [live, setLive] = useState<LiveNow | null>(null);
  const [state, setState] = useState<LiveNowState>("loading");
  const [tick, setTick] = useState(0);

  const home = homeOverride(skyCtx, deviceTz);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void sharedCoords().then((coords) => {
      if (!cancelled) setPlace(resolveNowPlace(home, coords, deviceTz));
    });
    return () => {
      cancelled = true;
    };
    // The home object is rebuilt on each render; its fields are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, home?.lat, home?.lon, home?.tz, deviceTz]);

  // Ask again every 15 minutes, and when the app returns to the front.
  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(() => setTick((n) => n + 1), LIVE_NOW_REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") setTick((n) => n + 1);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !place) return;
    let cancelled = false;
    api
      .liveNow(place.lat, place.lon, place.tz)
      .then((res) => {
        if (cancelled) return;
        setLive(res);
        setState("ready");
      })
      .catch(() => {
        if (cancelled) return;
        // Keep showing the last good answer if there is one; only say "unavailable" with nothing to show.
        setState((s) => (s === "ready" ? s : "unavailable"));
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, place, tick]);

  // A real place (not the Delhi fallback) is what the home-screen widget should show too.
  useEffect(() => {
    if (!enabled || !place || place.reference) return;
    void shareWidgetPlace({ lat: place.lat, lon: place.lon, tz: place.tz, name: place.name ?? "" });
  }, [enabled, place]);

  return { live, state, place };
}
