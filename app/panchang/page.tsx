"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Sun,
  Sunset,
  Clock,
  ShieldAlert,
  ShieldCheck,
  CalendarDays,
  MapPin,
  Navigation,
  ChevronDown,
} from "lucide-react";
import { api, type PanchangData, type PurchasePlan } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { useGeolocation } from "@/hooks/useGeolocation";
import Card from "@/components/ui/Card";
import SectionTitle from "@/components/SectionTitle";
import MonthlyPanchangCalendar from "@/components/panchang/MonthlyPanchangCalendar";
import PurchasePlanModal from "@/components/panchang/PurchasePlanModal";
import PurchasePlanResults from "@/components/panchang/PurchasePlanResults";
import { REGION_OPTIONS, REGION_META, type RegionId } from "@/lib/panchang/regions";
import { findAdhikMaas } from "@/lib/panchang/adhik-maas-ranges";

/** Delhi/NCR — the same national reference point GET /astro/panchang defaults to server-side. */
const REFERENCE_LAT = 28.6139;
const REFERENCE_LON = 77.209;

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
      <p className="text-sm text-foreground font-medium">
        {window.start} – {window.end}
      </p>
    </Card>
  );
}

function CollapsibleSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="border-gold/10 overflow-hidden p-0">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between px-4 py-3">
        <div className="text-left">
          <p className="text-xs font-display text-foreground">{title}</p>
          <p className="text-[10px] text-muted mt-0.5">{subtitle}</p>
        </div>
        <ChevronDown size={14} className={`text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-4 pb-4 border-t border-gold/10 pt-3">{children}</div>}
    </Card>
  );
}

function isCurrentlyActive(start: string, end: string): boolean {
  const now = new Date();
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  return currentMins >= startMins && currentMins < endMins;
}

export default function PanchangPage() {
  const { t } = useTranslation();
  const { firebaseUser, loading: authLoading } = useAuth();
  const geo = useGeolocation();

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [region, setRegion] = useState<RegionId>("north");

  const [refData, setRefData] = useState<PanchangData | null>(null);
  const [refState, setRefState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [userData, setUserData] = useState<PanchangData | null>(null);
  const [userState, setUserState] = useState<"idle" | "loading" | "ready" | "unavailable">("idle");
  const [source, setSource] = useState<"reference" | "mine">("reference");

  // Prefer the user's actual location by default — request it as soon as the
  // page opens rather than waiting for a manual "Your Location" tap. `source`
  // auto-switches to "mine" below once this resolves (see the userData
  // effect); if permission is denied/unavailable it silently stays on the
  // Delhi reference data already loading in parallel.
  useEffect(() => {
    if (geo.status === "idle") geo.request();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (authLoading || !firebaseUser) return;
    let cancelled = false;
    setRefState("loading");
    api
      .panchang(REFERENCE_LAT, REFERENCE_LON, selectedDate)
      .then((res) => {
        if (cancelled) return;
        setRefData(res);
        setRefState("ready");
      })
      .catch(() => {
        if (!cancelled) setRefState("unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, firebaseUser, selectedDate]);

  useEffect(() => {
    if (authLoading || !firebaseUser || !geo.coords) return;
    let cancelled = false;
    setUserState("loading");
    api
      .panchang(geo.coords.lat, geo.coords.lon, selectedDate)
      .then((res) => {
        if (cancelled) return;
        setUserData(res);
        setUserState("ready");
        setSource("mine");
      })
      .catch(() => {
        if (!cancelled) setUserState("unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, firebaseUser, geo.coords, selectedDate]);

  const data = source === "mine" && userData ? userData : refData;
  const state =
    source === "mine" ? (userState === "ready" ? "ready" : userState === "unavailable" ? "unavailable" : "loading") : refState;

  const regions: RegionId[] = ["north", "south", "west", "east"];

  // ─── Planning to Buy state ──────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [plans, setPlans] = useState<PurchasePlan[]>([]);
  const [pollingId, setPollingId] = useState<string | null>(null);
  const [plansLoaded, setPlansLoaded] = useState(false);

  const loadPlans = useCallback(async () => {
    if (plansLoaded) return;
    try {
      const res = await api.purchasePlanList();
      setPlans(res.plans);
    } catch {
      // silent — the section just shows no history yet
    } finally {
      setPlansLoaded(true);
    }
  }, [plansLoaded]);

  useEffect(() => {
    if (!authLoading && firebaseUser) loadPlans();
  }, [authLoading, firebaseUser, loadPlans]);

  function handleSubmitted(planId: string) {
    setPollingId(planId);
    setPlans((prev) => {
      const optimistic: PurchasePlan = {
        id: planId,
        category: "other",
        metadata: {},
        costBracket: null,
        resolvedBookingDate: "",
        resolvedDeliveryDate: "",
        status: "pending",
        analysis: null,
        errorMessage: null,
        createdAt: new Date().toISOString(),
        completedAt: null,
      };
      return [optimistic, ...prev];
    });
  }

  const handlePolled = useCallback((updated: PurchasePlan) => {
    setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await api.purchasePlanDelete(id);
      setPlans((prev) => prev.filter((p) => p.id !== id));
      if (pollingId === id) setPollingId(null);
    } catch {
      // ignore
    }
  }, [pollingId]);

  const regionMeta = REGION_META[region];
  const regionalMonth = data?.regionalMonths?.[region];
  const adhik = findAdhikMaas(selectedDate);

  return (
    <main className="min-h-screen pb-28" style={{ background: "var(--background)" }}>
      <div className="px-5 pt-4">
        <SectionTitle title={t("nav.panchang")} subtitle={data?.date ?? ""} />

        {/* Location source */}
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <div className="flex rounded-xl border border-gold/15 p-1 bg-surface/40">
            <button
              onClick={() => (userData ? setSource("mine") : geo.request())}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                source === "mine" && userData ? "bg-gold text-[#1a0e00]" : "text-muted"
              }`}
            >
              <Navigation size={12} />
              {geo.status === "requesting" || userState === "loading"
                ? t("horoscope.panchang.locating")
                : t("horoscope.panchang.yourLocation")}
            </button>
            <button
              onClick={() => setSource("reference")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                source === "reference" ? "bg-gold text-[#1a0e00]" : "text-muted"
              }`}
            >
              <MapPin size={12} /> {t("horoscope.panchang.referenceLocation")}
            </button>
          </div>
          {geo.status === "denied" && <span className="text-[11px] text-muted">{t("horoscope.panchang.locationDenied")}</span>}
        </div>
        {geo.status === "idle" && <p className="mt-2 text-[11px] text-muted">{t("horoscope.panchang.locationHint")}</p>}

        {/* Regional calendar + Adhik Maas */}
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <div className="flex rounded-xl border border-gold/15 p-1 bg-surface/40">
            {REGION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRegion(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  region === opt.value ? "bg-gold text-[#1a0e00]" : "text-muted"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <Card className="mt-2 p-3.5 border-gold/10 flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-[10px] text-muted uppercase tracking-wider">{regionMeta.calendarName}</p>
            <p className="text-sm text-foreground font-medium mt-0.5">
              {regionalMonth ? `${adhik ? "Adhik " : ""}${regionalMonth.monthName} ${regionalMonth.year}` : "—"}
              {regionalMonth?.paksha && (
                <span className="text-muted"> · {regionalMonth.paksha === "shukla" ? "Shukla" : "Krishna"} Paksha</span>
              )}
            </p>
          </div>
          {adhik && (
            <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-red-500/10 border border-red-500/25 text-red-400">
              🚫 {regionMeta.adhikMaasName} · {t("horoscope.panchang.adhikMaasAvoid")}
            </span>
          )}
        </Card>

        {/* Monthly calendar */}
        <div className="mt-4">
          <MonthlyPanchangCalendar
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            lat={source === "mine" ? geo.coords?.lat : undefined}
            lon={source === "mine" ? geo.coords?.lon : undefined}
          />
        </div>

        {state === "loading" && (
          <div className="mt-6 space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="p-4 border-gold/10 animate-pulse h-16" />
            ))}
          </div>
        )}

        {state === "unavailable" && (
          <Card className="mt-6 p-5 border-gold/10 text-center text-sm text-muted">{t("horoscope.panchang.unavailable")}</Card>
        )}

        {state === "ready" && data && (
          <div className="mt-6 space-y-6">
            {/* Core five */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {data.tithi && <FactCard label={t("horoscope.panchang.tithi")} value={data.tithi.name} sub={data.tithi.paksha} />}
              {data.vara && <FactCard label={t("horoscope.panchang.vaar")} value={data.vara} />}
              {data.nakshatra && (
                <FactCard label={t("horoscope.panchang.nakshatra")} value={data.nakshatra.name} sub={data.nakshatra.lord} />
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
                <h2 className="text-sm font-display text-foreground mb-3">{t("horoscope.panchang.auspiciousWindows")}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {data.rahuKaal && (
                    <WindowCard icon={<ShieldAlert size={14} />} label={t("horoscope.panchang.rahuKaal")} window={data.rahuKaal} tone="avoid" />
                  )}
                  {data.gulikaKaal && (
                    <WindowCard icon={<ShieldAlert size={14} />} label={t("horoscope.panchang.gulikaKaal")} window={data.gulikaKaal} tone="avoid" />
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

            {/* Choghadiya */}
            {data.choghadiya && (
              <CollapsibleSection title={t("horoscope.panchang.choghadiyaTitle")} subtitle={t("horoscope.panchang.choghadiyaSubtitle")}>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    { label: t("horoscope.panchang.daytime"), periods: data.choghadiya.day },
                    { label: t("horoscope.panchang.nighttime"), periods: data.choghadiya.night },
                  ].map(({ label, periods }) => (
                    <div key={label}>
                      <p className="text-[10px] text-muted uppercase tracking-wider mb-2">{label}</p>
                      <div className="space-y-1.5">
                        {periods.map((p, i) => {
                          const active = isCurrentlyActive(p.startTime, p.endTime);
                          const color = p.type === "good" ? "text-emerald-400" : p.type === "bad" ? "text-red-400" : "text-gold";
                          return (
                            <div
                              key={i}
                              className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-xs ${
                                active ? "bg-gold/10 border border-gold/25" : "bg-surface/30"
                              }`}
                            >
                              <span className={`font-medium ${color}`}>{p.name}</span>
                              <span className="text-muted font-mono">
                                {p.startTime} – {p.endTime}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* Hora */}
            {data.hora && (
              <CollapsibleSection title={t("horoscope.panchang.horaTitle")} subtitle={t("horoscope.panchang.horaSubtitle")}>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {data.hora.map((h, i) => {
                    const active = isCurrentlyActive(h.startTime, h.endTime);
                    return (
                      <div
                        key={i}
                        className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-xs ${
                          active ? "bg-gold/10 border border-gold/25" : "bg-surface/30"
                        }`}
                      >
                        <span className={`font-medium ${h.isAuspicious ? "text-emerald-400" : "text-foreground"}`}>{h.planet}</span>
                        <span className="text-muted font-mono">
                          {h.startTime} – {h.endTime}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleSection>
            )}

            {/* Regional calendars grid (kept from the original page — other regions at a glance) */}
            {data.regionalMonths && (
              <div>
                <h2 className="text-sm font-display text-foreground mb-3 flex items-center gap-2">
                  <CalendarDays size={14} className="text-gold" />
                  {t("horoscope.panchang.regionalCalendars")}
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {regions.map((r) => {
                    const m = data.regionalMonths?.[r];
                    if (!m) return null;
                    return (
                      <Card key={r} className="p-3.5 border-gold/10">
                        <p className="text-[10px] text-muted uppercase tracking-wider">{m.calendar}</p>
                        <p className="text-sm text-foreground font-medium mt-0.5">
                          {m.monthName} {m.year}
                        </p>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Planning to Buy */}
            <Card className="p-4 border-gold/15">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <div>
                  <p className="text-sm font-display text-foreground">{t("horoscope.panchang.planningToBuyTitle")}</p>
                  <p className="text-[11px] text-muted mt-0.5">{t("horoscope.panchang.planningToBuySubtitle")}</p>
                </div>
                <button
                  onClick={() => setModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-gold text-[#1a0e00] text-xs font-semibold"
                >
                  {t("horoscope.panchang.planningToBuyTitle")}
                </button>
              </div>
              {plans.length > 0 && <PurchasePlanResults plans={plans} pollingId={pollingId} onPolled={handlePolled} onDelete={handleDelete} />}
            </Card>

            <p className="flex items-center gap-1.5 text-[10px] text-muted justify-center pt-2">
              <Clock size={11} /> {data.date}
            </p>
          </div>
        )}
      </div>

      <PurchasePlanModal
        isOpen={modalOpen}
        panchangDate={selectedDate}
        onClose={() => setModalOpen(false)}
        onSubmitted={handleSubmitted}
      />
    </main>
  );
}
