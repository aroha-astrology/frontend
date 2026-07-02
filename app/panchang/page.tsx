"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Sun, Sunset, Clock, ShieldAlert, ShieldCheck, CalendarDays } from "lucide-react";
import { api, type PanchangData } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import Card from "@/components/ui/Card";
import SectionTitle from "@/components/SectionTitle";

function FactCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-3.5 border-gold/10 text-center">
      <p className="text-[10px] text-muted uppercase tracking-wider">{label}</p>
      <p className="text-sm text-foreground font-semibold mt-1">{value}</p>
      {sub && <p className="text-[10px] text-muted mt-0.5">{sub}</p>}
    </Card>
  );
}

function WindowCard({
  icon,
  label,
  window,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  window: { start: string; end: string };
  tone: "avoid" | "auspicious";
}) {
  const { t } = useTranslation();
  const borderBg = tone === "avoid" ? "border-red-500/20 bg-red-500/5" : "border-emerald-500/20 bg-emerald-500/5";
  const text = tone === "avoid" ? "text-red-400" : "text-emerald-400";
  return (
    <Card className={`p-4 ${borderBg}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={text}>{icon}</span>
        <p className="text-xs font-semibold text-foreground">{label}</p>
        <span className={`ml-auto text-[9px] font-semibold uppercase tracking-wider ${text}`}>
          {tone === "avoid" ? t("horoscope.panchang.avoid") : t("horoscope.panchang.auspicious")}
        </span>
      </div>
      <p className="text-sm text-foreground font-medium">{window.start} – {window.end}</p>
    </Card>
  );
}

export default function PanchangPage() {
  const { t } = useTranslation();
  const { firebaseUser, user, loading: authLoading } = useAuth();
  const [data, setData] = useState<PanchangData | null>(null);
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
        setData(res);
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("unavailable");
      });

    return () => { cancelled = true; };
  }, [authLoading, firebaseUser, user?.placeOfBirth]);

  const regions: Array<"north" | "south" | "west" | "east"> = ["north", "south", "west", "east"];

  return (
    <main className="min-h-screen pb-28" style={{ background: "var(--background)" }}>
      <div className="px-5 pt-10">
        <SectionTitle title={t("nav.panchang")} subtitle={data?.date ?? ""} />

        {state === "loading" && (
          <div className="mt-6 space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="p-4 border-gold/10 animate-pulse h-16" />
            ))}
          </div>
        )}

        {state === "unavailable" && (
          <Card className="mt-6 p-5 border-gold/10 text-center text-sm text-muted">
            {t("horoscope.panchang.unavailable")}
          </Card>
        )}

        {state === "ready" && data && (
          <div className="mt-6 space-y-6">
            {/* Core five */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {data.tithi && (
                <FactCard label={t("horoscope.panchang.tithi")} value={data.tithi.name} sub={data.tithi.paksha} />
              )}
              {data.vara && <FactCard label={t("horoscope.panchang.vaar")} value={data.vara} />}
              {data.nakshatra && (
                <FactCard
                  label={t("horoscope.panchang.nakshatra")}
                  value={data.nakshatra.name}
                  sub={data.nakshatra.lord}
                />
              )}
              {data.yoga && <FactCard label={t("horoscope.panchang.yoga")} value={data.yoga.name} />}
              {data.karana && <FactCard label={t("horoscope.panchang.karana")} value={data.karana.name} />}
            </div>

            {/* Sunrise / sunset */}
            {(data.sunriseTime || data.sunsetTime) && (
              <Card className="p-4 border-gold/10 flex items-center justify-around">
                {data.sunriseTime && (
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <Sun size={16} className="text-gold" /> {data.sunriseTime}
                  </div>
                )}
                {data.sunsetTime && (
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <Sunset size={16} className="text-gold" /> {data.sunsetTime}
                  </div>
                )}
              </Card>
            )}

            {/* Auspicious / inauspicious windows */}
            {(data.rahuKaal || data.gulikaKaal || data.yamagandaKaal || data.abhijitMuhurta) && (
              <div>
                <h2 className="text-sm font-display text-foreground mb-3">
                  {t("horoscope.panchang.auspiciousWindows")}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {data.rahuKaal && (
                    <WindowCard
                      icon={<ShieldAlert size={14} />}
                      label={t("horoscope.panchang.rahuKaal")}
                      window={data.rahuKaal}
                      tone="avoid"
                    />
                  )}
                  {data.gulikaKaal && (
                    <WindowCard
                      icon={<ShieldAlert size={14} />}
                      label={t("horoscope.panchang.gulikaKaal")}
                      window={data.gulikaKaal}
                      tone="avoid"
                    />
                  )}
                  {data.yamagandaKaal && (
                    <WindowCard
                      icon={<ShieldAlert size={14} />}
                      label={t("horoscope.panchang.yamagandaKaal")}
                      window={data.yamagandaKaal}
                      tone="avoid"
                    />
                  )}
                  {data.abhijitMuhurta && (
                    <WindowCard
                      icon={<ShieldCheck size={14} />}
                      label={t("horoscope.panchang.abhijitMuhurta")}
                      window={data.abhijitMuhurta}
                      tone="auspicious"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Regional calendars */}
            {data.regionalMonths && (
              <div>
                <h2 className="text-sm font-display text-foreground mb-3 flex items-center gap-2">
                  <CalendarDays size={14} className="text-gold" />
                  {t("horoscope.panchang.regionalCalendars")}
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {regions.map((region) => {
                    const m = data.regionalMonths?.[region];
                    if (!m) return null;
                    return (
                      <Card key={region} className="p-3.5 border-gold/10">
                        <p className="text-[10px] text-muted uppercase tracking-wider">{m.calendar}</p>
                        <p className="text-sm text-foreground font-medium mt-0.5">{m.monthName} {m.year}</p>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            <p className="flex items-center gap-1.5 text-[10px] text-muted justify-center pt-2">
              <Clock size={11} /> {data.date}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
