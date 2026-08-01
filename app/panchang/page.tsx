"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock, CalendarDays, MapPin, Navigation, ChevronDown } from "lucide-react";
import { api, type PanchangData, type PurchasePlan } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { useGeolocation } from "@/hooks/useGeolocation";
import Card from "@/components/ui/Card";
import MonthlyPanchangCalendar from "@/components/panchang/MonthlyPanchangCalendar";
import PurchasePlanModal from "@/components/panchang/PurchasePlanModal";
import PurchasePlanResults from "@/components/panchang/PurchasePlanResults";
import PanchangHeader from "@/components/panchang/PanchangHeader";
import TithiHero from "@/components/panchang/TithiHero";
import SunMoonTimings from "@/components/panchang/SunMoonTimings";
import ChoghadiyaTimeline from "@/components/panchang/ChoghadiyaTimeline";
import AuspiciousDays from "@/components/panchang/AuspiciousDays";
import { REGION_META, type RegionId } from "@/lib/panchang/regions";
import { findAdhikMaas } from "@/lib/panchang/adhik-maas-ranges";
import { buildKey, cacheGet, cacheSet, roundCoord } from "@/lib/cache";
import { isCurrentlyActive } from "@/lib/panchang/time-window";
import FeatureGuard from "@/components/FeatureGuard";
import { useFeature } from "@/hooks/useFeature";

/** An explicit `date` was passed to api.panchang — that day's panchang never changes once computed, so cache it for a fixed, generous window rather than tying it to IST-midnight rollover (which only makes sense for *today's* panchang — see PanchangStrip.tsx). */
const PANCHANG_FIXED_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Delhi/NCR — the same national reference point GET /astro/panchang defaults to server-side. */
const REFERENCE_LAT = 28.6139;
const REFERENCE_LON = 77.209;

/** Which regional lunar/solar calendar convention to show alongside the Gregorian month —
 * derived from the app's own selected language rather than a manual direction toggle (removed:
 * "North/South/West/East" read as compass directions to users, when this has only ever been
 * about which calendar-naming convention to display). Telugu and Tamil both map to "south" —
 * there's no separate region for them in the underlying regional.ts calculation, which only
 * models 4 conventions (Vikram Samvat, Shalivahana Shaka x2 spellings, Bengali San). */
const LANGUAGE_TO_REGION: Record<string, RegionId> = {
  hi: "north",
  bn: "east",
  mr: "west",
  gu: "west",
  te: "south",
  ta: "south",
};

function FactCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-3.5 border-gold/10 text-center">
      <p className="text-[10px] text-muted uppercase tracking-wider">{label}</p>
      <p className="text-sm text-foreground font-semibold mt-1">{value}</p>
      {sub && <p className="text-[10px] text-muted mt-0.5">{sub}</p>}
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

export default function PanchangPage() {
  const { t, i18n } = useTranslation();
  const { firebaseUser, loading: authLoading } = useAuth();
  const geo = useGeolocation();
  const { enabled: purchasePlanEnabled } = useFeature("panchang.purchasePlan");

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const region: RegionId = LANGUAGE_TO_REGION[i18n.language] ?? "north";

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

    // Hard cache (see lib/cache.ts): `date` (selectedDate) is always passed
    // explicitly here — a fixed TTL, not periodExpiresAt('daily'), since a
    // past/future date's panchang is immutable regardless of today's rollover.
    // "v2" bumped alongside the moonrise/moonset + tithi/nakshatra endsAt
    // fields added to PanchangData — without it, a pre-existing localStorage
    // entry from before that change would keep being served (matching this
    // same key) and silently look like "no moonrise", forever, since nothing
    // else about the key would ever invalidate it.
    const cacheKey = buildKey("panchang", "v2", roundCoord(REFERENCE_LAT), roundCoord(REFERENCE_LON), selectedDate);
    const cached = cacheGet<PanchangData>(cacheKey);
    if (cached) {
      setRefData(cached);
      setRefState("ready");
      return;
    }

    api
      .panchang(REFERENCE_LAT, REFERENCE_LON, selectedDate)
      .then((res) => {
        if (cancelled) return;
        setRefData(res);
        setRefState("ready");
        cacheSet(cacheKey, res, Date.now() + PANCHANG_FIXED_TTL_MS);
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

    const cacheKey = buildKey("panchang", "v2", roundCoord(geo.coords.lat), roundCoord(geo.coords.lon), selectedDate);
    const cached = cacheGet<PanchangData>(cacheKey);
    if (cached) {
      setUserData(cached);
      setUserState("ready");
      setSource("mine");
      return;
    }

    api
      .panchang(geo.coords.lat, geo.coords.lon, selectedDate)
      .then((res) => {
        if (cancelled) return;
        setUserData(res);
        setUserState("ready");
        setSource("mine");
        cacheSet(cacheKey, res, Date.now() + PANCHANG_FIXED_TTL_MS);
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
    try {
      const res = await api.purchasePlanList(i18n.language);
      setPlans(res.plans);
    } catch {
      // silent — the section just shows no history yet
    } finally {
      setPlansLoaded(true);
    }
  }, [i18n.language]);

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
  const adhik = findAdhikMaas(selectedDate);

  // Share text for PanchangHeader's native-share button — a plain-text
  // summary of today's core facts, not a deep link (no shareable per-date
  // URL exists for this page yet).
  const shareText = data
    ? t("horoscope.panchang.shareText", {
        date: data.date,
        tithi: data.tithi?.name ?? "—",
        nakshatra: data.nakshatra?.name ?? "—",
        vara: data.vara ?? "—",
      })
    : t("horoscope.panchang.todayTitle");

  return (
    <FeatureGuard featureKey="nav.panchang">
    <main className="min-h-screen pb-tab-safe" style={{ background: "var(--background)" }}>
      <div className="px-5 pt-4">
        <PanchangHeader subtitle={data?.date ?? ""} shareText={shareText} />

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
        {geo.status === "requesting" && (
          <p className="mt-2 text-[11px] text-gold flex items-center gap-1.5">
            <span className="w-3 h-3 border-2 border-gold/40 border-t-gold rounded-full animate-spin shrink-0" />
            {t("horoscope.panchang.findingLocation")}
          </p>
        )}
        {geo.status === "idle" && <p className="mt-2 text-[11px] text-muted">{t("horoscope.panchang.locationHint")}</p>}
        {geo.status === "granted" && geo.locationName && (
          <p className="mt-2 text-[11px] text-muted flex items-center gap-1">
            <MapPin size={10} /> {geo.locationName}
          </p>
        )}

        {/* Adhik Maas banner — a specific-day fact (unlike the calendar's own regional month/year
            header below, which is a whole-month label), so it stays keyed off selectedDate here. */}
        {adhik && (
          <Card className="mt-4 p-3.5 border-gold/10 flex items-center justify-between flex-wrap gap-2">
            <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-red-500/10 border border-red-500/25 text-red-400">
              🚫 {regionMeta.adhikMaasName} · {t("horoscope.panchang.adhikMaasAvoid")}
            </span>
          </Card>
        )}

        {/* Monthly calendar — shows the regional month/year (derived from app language, see
            LANGUAGE_TO_REGION) stacked under the Gregorian month in its own header. */}
        <div className="mt-4">
          <MonthlyPanchangCalendar
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            lat={source === "mine" ? geo.coords?.lat : undefined}
            lon={source === "mine" ? geo.coords?.lon : undefined}
            region={region}
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
            {/* Hero: today's vara-lord orb, tithi, festival pill, and the Rahu Kaal / Abhijit Muhurta bar */}
            <TithiHero data={data} dateIso={selectedDate} />

            {/* Remaining core facts — tithi itself is already covered by the hero above, so it's left out here to avoid showing it twice. */}
            {(data.vara || data.nakshatra || data.yoga || data.karana) && (
              <div className="grid grid-cols-2 gap-3">
                {data.vara && <FactCard label={t("horoscope.panchang.vaar")} value={data.vara} />}
                {data.nakshatra && (
                  <FactCard label={t("horoscope.panchang.nakshatra")} value={data.nakshatra.name} sub={data.nakshatra.lord} />
                )}
                {data.yoga && <FactCard label={t("horoscope.panchang.yoga")} value={data.yoga.name} />}
                {data.karana && <FactCard label={t("horoscope.panchang.karana")} value={data.karana.name} />}
              </div>
            )}

            {/* Sunrise/sunset (+ moonrise/moonset when available) */}
            <SunMoonTimings
              sunriseTime={data.sunriseTime}
              sunsetTime={data.sunsetTime}
              moonriseTime={data.moonriseTime}
              moonsetTime={data.moonsetTime}
            />

            {/* Choghadiya — one continuous day+night rail (replaces the old collapsed accordion) */}
            {data.choghadiya && (
              <Card className="p-4 border-gold/10">
                <h2 className="text-sm font-display text-foreground mb-3">{t("horoscope.panchang.choghadiyaTitle")}</h2>
                <ChoghadiyaTimeline day={data.choghadiya.day} night={data.choghadiya.night} />
              </Card>
            )}

            <AuspiciousDays
              lat={source === "mine" ? geo.coords?.lat : undefined}
              lon={source === "mine" ? geo.coords?.lon : undefined}
            />

            {/* Hora — kept as an accordion, out of scope for this redesign */}
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

            {/* Planning to Buy — gated by the panchang.purchasePlan admin toggle */}
            {purchasePlanEnabled && (
              <Card id="purchase-plans" className="p-4 border-gold/15">
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
            )}

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
    </FeatureGuard>
  );
}
