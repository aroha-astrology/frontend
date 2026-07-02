"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Sun, Sunset } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import Card from "@/components/ui/Card";

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

/** Daily Panchang strip (Tithi, Vaar, Nakshatra, Yoga, Karana, sunrise/sunset, Rahu Kaal) — same across all four chart styles (spec 3.1). */
export default function PanchangStrip() {
  const { t } = useTranslation();
  const { firebaseUser, user, loading: authLoading } = useAuth();
  const [data, setData] = useState<PanchangFacts | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "unavailable">("loading");

  useEffect(() => {
    if (authLoading || !firebaseUser) return;
    let cancelled = false;

    const place = user?.placeOfBirth;
    const lat = place?.lat ?? 28.6139;
    const lon = place?.lon ?? 77.209;

    api
      .panchang(lat, lon)
      .then((res) => {
        if (cancelled) return;
        setData(res as unknown as PanchangFacts);
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("unavailable");
      });

    return () => { cancelled = true; };
  }, [authLoading, firebaseUser, user?.placeOfBirth]);

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
        { label: t("horoscope.panchang.tithi"), value: nameOf(data.tithi) },
        { label: t("horoscope.panchang.vaar"), value: data.vara ?? null },
        { label: t("horoscope.panchang.nakshatra"), value: nameOf(data.nakshatra) },
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
