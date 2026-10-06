"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type PanchangData } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { buildKey, cacheGet, cacheSet, roundCoord } from "@/lib/cache";
import { istToday, periodExpiresAt } from "@/lib/period-expiry";
import { loadGitaVerses, type GitaVerse } from "@/lib/gita";
import { loadShlokas, type Shloka } from "@/lib/shlokas";
import { deityForDate, type WeekdayDeity } from "@/lib/stories/deity";
import { pickDailyVerse } from "@/lib/stories/gita-daily";
import { pickBestHora, type BestHora } from "@/lib/stories/hora";
import { localDayIso } from "@/lib/stories/seen";

/** Delhi/NCR — the same national reference point GET /v1/panchang defaults to server-side. */
const REFERENCE_LAT = 28.6139;
const REFERENCE_LON = 77.209;

export type LoadState = "loading" | "ready" | "unavailable";

/** Everything the four stories show, worked out once so a slide and its share card always agree. */
export interface DailyStoriesData {
  /** The device's calendar day, "YYYY-MM-DD" — the day the seen state and the Gita verse are keyed on. */
  day: string;
  now: Date;
  panchang: PanchangData | null;
  panchangState: LoadState;
  /** True when the timings are for Delhi because this device has not shared its location. */
  referenceLocation: boolean;
  hora: BestHora | null;
  deity: WeekdayDeity;
  /** The deity's mantra from the Shlokas library, once that has loaded. */
  mantra: Shloka | null;
  verse: GitaVerse | null;
  verseState: LoadState;
}

/**
 * The device's position, but only when it was already shared with the app:
 * the story ring sits on Home, and Home must not open a location prompt.
 */
async function sharedCoords(): Promise<{ lat: number; lon: number } | null> {
  try {
    if (!navigator.permissions || !navigator.geolocation) return null;
    const status = await navigator.permissions.query({ name: "geolocation" });
    if (status.state !== "granted") return null;
    return await new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: false, timeout: 4_000, maximumAge: 60 * 60_000 },
      );
    });
  } catch {
    return null;
  }
}

/**
 * Loads today's stories. `enabled` is the feature flag; `open` is whether the
 * viewer is showing. The panchang (one small, day-cached request shared with
 * the horoscope page's strip) loads as soon as the flag is on, so the first
 * story is ready when the ring is tapped. The Gita verse list and the mantra
 * library are much bigger and wait for the viewer to open.
 */
export function useDailyStories(enabled: boolean, open: boolean): DailyStoriesData {
  const { firebaseUser, loading: authLoading } = useAuth();
  const [now, setNow] = useState(() => new Date());
  const [panchang, setPanchang] = useState<PanchangData | null>(null);
  const [panchangState, setPanchangState] = useState<LoadState>("loading");
  const [referenceLocation, setReferenceLocation] = useState(true);
  const [verses, setVerses] = useState<GitaVerse[] | null>(null);
  const [verseState, setVerseState] = useState<LoadState>("loading");
  const [shlokas, setShlokas] = useState<Shloka[] | null>(null);

  // The hora's "42 min left" has to keep moving while the viewer is open.
  useEffect(() => {
    if (!open) return;
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, [open]);

  // The app often stays open in the background overnight. Coming back to it on a
  // new day has to bring a new day's stories (and an unseen ring) without a reload.
  useEffect(() => {
    if (!enabled) return;
    const refresh = () => {
      if (document.visibilityState === "visible") setNow(new Date());
    };
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, [enabled]);

  const day = localDayIso(now);

  useEffect(() => {
    if (!enabled || authLoading || !firebaseUser) return;
    let cancelled = false;
    setPanchangState("loading");

    void sharedCoords().then((coords) => {
      if (cancelled) return;
      const lat = coords?.lat ?? REFERENCE_LAT;
      const lon = coords?.lon ?? REFERENCE_LON;
      setReferenceLocation(!coords);

      // Same key and expiry as components/horoscope/PanchangStrip.tsx, so the two share one request a day.
      const cacheKey = buildKey("panchang", "v2", roundCoord(lat), roundCoord(lon), istToday());
      const cached = cacheGet<PanchangData>(cacheKey);
      if (cached) {
        setPanchang(cached);
        setPanchangState("ready");
        return;
      }
      api
        .panchang(lat, lon)
        .then((res) => {
          if (cancelled) return;
          setPanchang(res);
          setPanchangState("ready");
          cacheSet(cacheKey, res, periodExpiresAt("daily"));
        })
        .catch(() => {
          if (!cancelled) setPanchangState("unavailable");
        });
    });

    return () => {
      cancelled = true;
    };
    // `day` is here so a new day fetches a new panchang.
  }, [enabled, authLoading, firebaseUser, day]);

  useEffect(() => {
    if (!enabled || !open) return;
    let cancelled = false;
    loadGitaVerses()
      .then((all) => {
        if (cancelled) return;
        setVerses(all);
        setVerseState("ready");
      })
      .catch(() => {
        if (!cancelled) setVerseState("unavailable");
      });
    // Only the mantra's name comes from here; without it the Deity story still shows and just has no chant button.
    loadShlokas()
      .then((all) => {
        if (!cancelled) setShlokas(all);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [enabled, open]);

  const deity = deityForDate(now);

  return useMemo(
    () => ({
      day,
      now,
      panchang,
      panchangState,
      referenceLocation,
      hora: panchang?.hora ? pickBestHora(panchang.hora, now) : null,
      deity,
      mantra: shlokas?.find((s) => s.slug === deity.slug) ?? null,
      verse: verses ? pickDailyVerse(verses, day) : null,
      verseState: verses && !pickDailyVerse(verses, day) ? "unavailable" : verseState,
    }),
    [day, now, panchang, panchangState, referenceLocation, deity, shlokas, verses, verseState],
  );
}
