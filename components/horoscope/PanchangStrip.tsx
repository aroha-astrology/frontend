"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePanchangNames } from "@/hooks/usePanchangNames";
import { Sun, Sunset } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { useGeolocation } from "@/hooks/useGeolocation";
import Card from "@/components/ui/Card";
import { buildKey, cacheGet, cacheSet, roundCoord } from "@/lib/cache";
import { periodExpiresAt } from "@/lib/period-expiry";
import { deviceTimeZone, IST_ZONE, localToday } from "@/lib/calendar-format";

/** Delhi/NCR — same national reference point GET /astro/panchang defaults to server-side. */
const REFERENCE_LAT = 28.6139;
const REFERENCE_LON = 77.209;

interface PanchangFacts {
  date: string;
  tithi: { name?: string } | null;
  nakshatra: { name?: string } | null;
  yoga: { name?: string } | null;
  karana: { name?: string } | null;
  vara?: string;
  sunriseTime?: string;
  sunsetTime?: string;
  rahuKaal?: { start: string; end: string } | null;
}

function nameOf(field: { name?: string } | null | undefined): string | null {
  return field?.name ?? null;
}

function localName(name: string | null, fn: (n: string) => string): string | null {
  return name ? fn(name) : null;
}

/** Daily Panchang strip (Tithi, Vaar, Nakshatra, Yoga, Karana, sunrise/sunset, Rahu Kaal) — same across all four chart styles (spec 3.1). */
export default function PanchangStrip() {
  const { t } = useTranslation();
  const names = usePanchangNames();
  const { firebaseUser, loading: authLoading } = useAuth();
  const geo = useGeolocation();
  const [data, setData] = useState<PanchangFacts | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "unavailable">("loading");

  // Request live location once on mount — same pattern as the full Panchang
  // page (app/panchang/page.tsx). Falls back to the Delhi reference point
  // while pending/denied rather than the user's birth place, which is
  // frequently a different city than where they currently are.
  useEffect(() => {
    if (geo.status === "idle") geo.request();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (authLoading || !firebaseUser) return;
    let cancelled = false;

    const lat = geo.coords?.lat ?? REFERENCE_LAT;
    const lon = geo.coords?.lon ?? REFERENCE_LON;
    // The user's own spot reads on the device clock (users abroad); the Delhi fallback on IST.
    const tz = geo.coords ? deviceTimeZone() : IST_ZONE;
    const today = localToday(tz);

    // Hard cache (see lib/cache.ts): this strip is always *today's* panchang
    // (today on the clock it is read in), so the key carries that date + zone
    // and expires at the next IST midnight rather than a fixed TTL.
    // v3: the zone joined the key and the request.
    // "v2" — see app/panchang/page.tsx for why this segment exists (bumped
    // alongside PanchangData's new moonrise/moonset + endsAt fields so a
    // pre-existing cache entry from before that change isn't served forever).
    const cacheKey = buildKey("panchang", "v3", roundCoord(lat), roundCoord(lon), today, tz);
    const cached = cacheGet<PanchangFacts>(cacheKey);
    if (cached) {
      setData(cached);
      setState("ready");
      return;
    }

    api
      .panchang(lat, lon, today, tz)
      .then((res) => {
        if (cancelled) return;
        setData(res as unknown as PanchangFacts);
        setState("ready");
        cacheSet(cacheKey, res, periodExpiresAt("daily"));
      })
      .catch(() => {
        if (!cancelled) setState("unavailable");
      });

    return () => { cancelled = true; };
  }, [authLoading, firebaseUser, geo.coords]);

  if (state === "loading") {
    return (
      <Card className="p-4 border-gold/10 animate-pulse">
        <div className="h-3 w-full rounded bg-gold/5" />
      </Card>
    );
  }

  // Backend fields can legitimately come back null for a given date/location —
  // degrade to an empty-state message rather than showing blank/broken cells.
  const facts = data
    ? [
        { label: t("horoscope.panchang.tithi"), value: localName(nameOf(data.tithi), names.tithi) },
        { label: t("horoscope.panchang.vaar"), value: data.vara ?? null },
        { label: t("horoscope.panchang.nakshatra"), value: localName(nameOf(data.nakshatra), names.nakshatra) },
        { label: t("horoscope.panchang.yoga"), value: nameOf(data.yoga) },
        { label: t("horoscope.panchang.karana"), value: nameOf(data.karana) },
      ]
    : [];
  const hasAnyFact = facts.some((f) => f.value);

  if (state === "unavailable" || !hasAnyFact) {
    return (
      <Card className="p-4 border-gold/10 text-center text-xs text-muted">
        {t("horoscope.panchang.unavailable")}
      </Card>
    );
  }

  return (
    <Card initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-4 border-gold/10">
      <p className="text-[10px] text-muted uppercase tracking-wider mb-2.5">{t("horoscope.panchang.todayTitle")}</p>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
        {facts.filter((f) => f.value).map((f) => (
          <div key={f.label} className="min-w-[84px] shrink-0 text-center">
            <p className="text-[10px] text-muted uppercase tracking-wider">{f.label}</p>
            <p className="text-xs text-foreground font-medium mt-0.5">{f.value}</p>
          </div>
        ))}
      </div>
      {(data?.sunriseTime || data?.sunsetTime || data?.rahuKaal) && (
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gold/10 text-[11px] text-muted">
          {data?.sunriseTime && (
            <span className="flex items-center gap-1"><Sun size={12} className="text-gold" /> {data.sunriseTime}</span>
          )}
          {data?.sunsetTime && (
            <span className="flex items-center gap-1"><Sunset size={12} className="text-gold" /> {data.sunsetTime}</span>
          )}
          {data?.rahuKaal && (
            <span>{t("horoscope.panchang.rahuKaal")}: {data.rahuKaal.start}–{data.rahuKaal.end}</span>
          )}
        </div>
      )}
    </Card>
  );
}
