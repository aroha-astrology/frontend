"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { swarmApi, type BirthInput, type OnboardingResponse, type OnboardingCharts } from "@/lib/swarm-api";
import { useKundli } from "@/hooks/useKundli";
import PlaceAutocomplete from "@/components/PlaceAutocomplete";
import { api, type PlaceOfBirth, type KundliReady } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import Card from "@/components/ui/Card";
import NorthIndianChart from "@/components/ui/NorthIndianChart";
import SouthIndianChart from "@/components/ui/SouthIndianChart";
import PlanetsTable from "@/components/ui/PlanetsTable";
import HouseGrid from "@/components/ui/HouseGrid";
import TopBar from "@/components/TopBar";
import HouseUnlockDrawer from "@/components/ui/HouseUnlockDrawer";
import DashaTimeline from "@/components/ui/DashaTimeline";
import YogaCard, { type Yoga } from "@/components/ui/YogaCard";
import DoshaCard, { type DoshaAnalysis } from "@/components/ui/DoshaCard";
import VargaChartTabs from "@/components/ui/VargaChartTabs";

// ─── Types ────────────────────────────────────────────────────────────────────

type ChartStyle = "north" | "south";
type ViewMode = "plain" | "technical";

interface FormData {
  name: string;
  date: string;
  time: string;
  place: string;
}

interface NormalizedKundli {
  planets: any[];
  houses: any[];
  ascendant: Record<string, any> | null;
  dasha: any | null;
  yogas: Yoga[];
  doshas: DoshaAnalysis | null;
  divisionalCharts: Record<string, any>;
}

// ─── Data normalizer ─────────────────────────────────────────────────────────
//
// Two possible sources:
//   REST  (KundliReady):      chart, dasha, yogas, doshas are siblings at the top level.
//   Swarm (OnboardingResponse): charts.planets, charts.houses, charts.chart.ascendant,
//                               charts.dasha  (mahadashaSequence, not mahadashas).
//
// We normalize both into one flat shape that the page consumes.

function normalizeKundli(
  source: KundliReady | OnboardingResponse,
): NormalizedKundli {
  const isRest = "chart" in source && source.chart !== undefined;

  if (isRest) {
    // ── REST path ──────────────────────────────────────────────────────────
    const k = source as KundliReady;
    const chart = k.chart as Record<string, any> ?? {};
    const planets: any[] = (chart.planets as any[]) ?? [];
    const houses: any[] = (chart.houses as any[]) ?? [];
    const ascendant =
      (chart.ascendant as Record<string, any> | null) ??
      (chart.chart as any)?.ascendant ??
      null;

    // REST: dasha lives at top-level k.dasha.vimshottari
    const dashaTop = k.dasha as Record<string, any> | null;
    const dasha = dashaTop?.vimshottari ?? dashaTop ?? null;

    // REST: yogas live at k.yogas.yogas[]
    const yogaTop = k.yogas as Record<string, any> | null;
    const yogas: Yoga[] = (yogaTop?.yogas as Yoga[]) ?? [];

    // REST: doshas live at k.doshas directly
    const doshas: DoshaAnalysis | null = (k.doshas as DoshaAnalysis) ?? null;

    const divisionalCharts: Record<string, any> =
      (chart.divisionalCharts as Record<string, any>) ?? {};

    return { planets, houses, ascendant, dasha, yogas, doshas, divisionalCharts };
  } else {
    // ── Swarm/Onboarding path ──────────────────────────────────────────────
    const o = source as OnboardingResponse;
    const ch: OnboardingCharts = o.charts ?? {};
    const planets: any[] = (ch.planets as any[]) ?? [];
    const houses: any[] = (ch.houses as any[]) ?? [];
    const ascendant = (ch.chart?.ascendant as Record<string, any> | null) ?? null;

    // Swarm dasha uses mahadashaSequence instead of mahadashas
    const swarmDasha = ch.dasha;
    const dasha = swarmDasha
      ? {
          mahadashas: swarmDasha.mahadashaSequence ?? [],
          currentMahadasha: swarmDasha.currentMahadasha ?? null,
          currentAntardasha: swarmDasha.currentAntardasha ?? null,
          currentPratyantardasha: null,
        }
      : null;

    // Swarm onboarding does not reliably carry yoga/dosha data — return empty;
    // user must reload to hit REST path.
    return {
      planets,
      houses,
      ascendant,
      dasha,
      yogas: [],
      doshas: null,
      divisionalCharts: {},
    };
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const PLANET_GLYPHS: Record<string, string> = {
  Sun: "☉", Moon: "☾", Mars: "♂", Mercury: "☿",
  Jupiter: "♃", Venus: "♀", Saturn: "♄", Rahu: "☊", Ketu: "☋",
};

function SectionHeading({ icon = "✦", children }: { icon?: string; children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] font-semibold tracking-[0.25em] uppercase text-gold mb-3 flex items-center gap-2">
      <span className="text-gold text-xs">{icon}</span>
      {children}
      <span className="h-px flex-1 bg-gradient-to-r from-gold/30 to-transparent" />
    </h3>
  );
}

/** Sticky Plain / Technical toggle — same visual pattern as the horoscope page toggle */
function ViewModeToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  const { t } = useTranslation();
  return (
    <div className="sticky top-0 z-10 py-2 backdrop-blur-md" style={{ background: "var(--background)cc" }}>
      <div className="flex gap-1 p-1 rounded-2xl bg-surface/60 border border-gold/10 w-fit mx-auto">
        {(["plain", "technical"] as ViewMode[]).map((m) => (
          <button
            key={m}
            onClick={() => onChange(m)}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              mode === m
                ? "bg-gold text-black shadow-sm shadow-gold/20"
                : "text-muted hover:text-foreground"
            }`}
          >
            {t(`horoscope.toggle.${m}`)}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Plain-mode planet pills row */
function PlainPlanetPills({ planets }: { planets: any[] }) {
  const { t } = useTranslation();
  if (!planets.length) return null;
  return (
    <Card className="p-4">
      <SectionHeading>{t("kundli.planetsGlance")}</SectionHeading>
      <div className="flex flex-wrap gap-1.5">
        {planets.map((p: any) => (
          <div
            key={p.planet}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gold/8 border border-gold/15 text-[11px]"
          >
            <span className="text-gold text-xs">{PLANET_GLYPHS[p.planet] ?? ""}</span>
            <span className="font-semibold text-foreground">{p.planet}</span>
            <span className="text-muted">in {p.sign}, H{p.house}</span>
            {p.isRetrograde && <span className="text-purple-400 text-[9px]">R</span>}
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Header card — name, DOB meta, and ascendant/moon/sun/nakshatra pills */
function KundliHeaderCard({
  name,
  planets,
  ascendant,
}: {
  name?: string | null;
  planets: any[];
  ascendant: Record<string, any> | null;
}) {
  const { t } = useTranslation();
  const moon = planets.find((p: any) => p.planet === "Moon");
  const sun = planets.find((p: any) => p.planet === "Sun");

  const pills = [
    { label: t("kundli.ascendant"), value: ascendant?.ascendantSign ?? ascendant?.sign },
    { label: t("kundli.moonSign"), value: moon?.sign },
    { label: t("kundli.sunSign"), value: sun?.sign },
    { label: t("kundli.nakshatra"), value: moon?.nakshatra },
  ].filter((p) => p.value);

  return (
    <Card className="p-4">
      {name && (
        <h2 className="text-lg font-bold text-foreground font-display mb-1">{name}</h2>
      )}
      <p className="text-xs text-muted mb-3">{t("kundli.subtitle")}</p>
      <div className="flex flex-wrap gap-2">
        {pills.map(({ label, value }) => (
          <div key={label} className="flex flex-col items-start px-3 py-1.5 rounded-xl bg-gold/8 border border-gold/15">
            <span className="text-[9px] text-muted uppercase tracking-wider">{label}</span>
            <span className="text-xs font-bold text-gold">{value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Plain-mode current dasha reading — sentence-style */
function PlainDashaCard({ dasha }: { dasha: any }) {
  const { t } = useTranslation();
  const maha = dasha?.currentMahadasha?.planet ?? dasha?.currentMahadasha?.lord;
  const antar = dasha?.currentAntardasha?.planet ?? dasha?.currentAntardasha?.lord;
  const mahaEnd = dasha?.currentMahadasha?.end ?? dasha?.currentMahadasha?.endDate;

  if (!maha) return null;

  return (
    <Card className="p-4">
      <SectionHeading>{t("horoscope.dasha.title")}</SectionHeading>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted uppercase tracking-wider">{t("horoscope.dasha.mahadasha")}</span>
          <span className="text-sm font-bold text-gold">{maha}</span>
        </div>
        {antar && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted uppercase tracking-wider">{t("horoscope.dasha.antardasha")}</span>
            <span className="text-sm font-bold text-foreground">{antar}</span>
          </div>
        )}
        {mahaEnd && (
          <p className="text-xs text-muted mt-1">
            {t("horoscope.dasha.activeUntil", {
              date: new Date(mahaEnd).toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
            })}
          </p>
        )}
      </div>
    </Card>
  );
}

/** Yoga + Dosha stat row with tap-to-expand */
function YogaDoshaSection({
  yogas,
  doshas,
  mode,
}: {
  yogas: Yoga[];
  doshas: DoshaAnalysis | null;
  mode: ViewMode;
}) {
  const { t } = useTranslation();
  const [showYogas, setShowYogas] = useState(false);
  const [showDoshas, setShowDoshas] = useState(false);

  const presentYogas = yogas.filter((y) => y.present);
  const presentDoshaCount = doshas
    ? [
        doshas.mangal?.present,
        doshas.kaalSarp?.present,
        doshas.sadeSati?.active,
        doshas.pitra?.present,
        doshas.kemDruma?.present,
        doshas.grahan?.present && doshas.grahan?.type !== "none",
        doshas.guruChandal?.present,
      ].filter(Boolean).length
    : 0;

  if (!presentYogas.length && !presentDoshaCount) return null;

  return (
    <Card className="p-4">
      {/* Stat row */}
      <div className="flex gap-3 mb-4">
        {presentYogas.length > 0 && (
          <button
            onClick={() => setShowYogas(!showYogas)}
            className="flex-1 flex flex-col items-center py-2.5 rounded-xl bg-emerald-500/8 border border-emerald-500/15 active:bg-emerald-500/15 transition-colors"
          >
            <span className="text-lg font-bold text-emerald-400">{presentYogas.length}</span>
            <span className="text-[10px] text-muted text-center leading-tight mt-0.5">
              {presentYogas.length === 1
                ? t("kundli.yogasFound", { count: presentYogas.length })
                : t("kundli.yogasFound_plural", { count: presentYogas.length })}
            </span>
            <span className="text-[9px] text-emerald-400/60 mt-1">{showYogas ? "▲" : "▼"}</span>
          </button>
        )}
        {presentDoshaCount > 0 && (
          <button
            onClick={() => setShowDoshas(!showDoshas)}
            className="flex-1 flex flex-col items-center py-2.5 rounded-xl bg-red-500/8 border border-red-500/15 active:bg-red-500/15 transition-colors"
          >
            <span className="text-lg font-bold text-red-400">{presentDoshaCount}</span>
            <span className="text-[10px] text-muted text-center leading-tight mt-0.5">
              {presentDoshaCount === 1
                ? t("kundli.doshasFound", { count: presentDoshaCount })
                : t("kundli.doshasFound_plural", { count: presentDoshaCount })}
            </span>
            <span className="text-[9px] text-red-400/60 mt-1">{showDoshas ? "▲" : "▼"}</span>
          </button>
        )}
      </div>

      {/* Expanded yoga list */}
      {showYogas && presentYogas.length > 0 && (
        <div className="mt-2 border-t border-gold/10 pt-3">
          <YogaCard yogas={yogas} mode={mode} />
        </div>
      )}

      {/* Expanded dosha list */}
      {showDoshas && doshas && presentDoshaCount > 0 && (
        <div className="mt-2 border-t border-gold/10 pt-3">
          <DoshaCard doshas={doshas} mode={mode} />
        </div>
      )}
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function KundliPage() {
  const { t } = useTranslation();

  // Existing kundli from REST /v1/kundli
  const { kundli, loading: kundliLoading } = useKundli();

  // Fresh-generation form state
  const [form, setForm] = useState<FormData>({ name: "", date: "", time: "", place: "" });
  const [resolvedPlace, setResolvedPlace] = useState<PlaceOfBirth | null>(null);
  const [generating, setGenerating] = useState(false);
  const [freshResult, setFreshResult] = useState<OnboardingResponse | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Chart / display state
  const [chartStyle, setChartStyle] = useState<ChartStyle>("north");
  const [viewMode, setViewMode] = useState<ViewMode>("plain");

  // Credits/unlocked-houses are the authoritative server values on the
  // signed-in user row (POST /v1/me/unlock-house), not local state — refresh()
  // re-fetches them from GET /v1/me after a successful unlock.
  const { user, refresh: refreshUser } = useAuth();
  const credits = user?.credits ?? 0;
  const unlockedHouses = user?.unlockedHouses ?? [];
  const [selectedHouse, setSelectedHouse] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const UNLOCK_COST = 5;

  const handleGenerate = async () => {
    if (!form.name || !form.date) return;
    setGenerating(true);
    setFormError(null);
    setFreshResult(null);
    try {
      const geo = resolvedPlace ?? { lat: 28.6139, lon: 77.209, tz: "Asia/Kolkata" };
      const birth: BirthInput = {
        date: form.date,
        time: form.time || "12:00",
        latitude: geo.lat,
        longitude: geo.lon,
        timezone: geo.tz,
      };
      const response = await swarmApi.onboarding(birth);
      setFreshResult(response);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("kundliPage.generateError"));
    } finally {
      setGenerating(false);
    }
  };

  // Determine data source — REST takes priority over swarm/fresh
  const hasExisting = kundli?.status === "ready" && kundli.chart;
  const hasFresh = !!(freshResult?.charts);
  const hasData = hasExisting || hasFresh;

  const chartData = useMemo<NormalizedKundli | null>(() => {
    if (hasExisting) return normalizeKundli(kundli as KundliReady);
    if (hasFresh) return normalizeKundli(freshResult as OnboardingResponse);
    return null;
  }, [hasExisting, hasFresh, kundli, freshResult]);

  const { planets, houses, ascendant, dasha, yogas, doshas, divisionalCharts } =
    chartData ?? {
      planets: [], houses: [], ascendant: null, dasha: null,
      yogas: [], doshas: null, divisionalCharts: {},
    };

  const displayName =
    hasExisting
      ? (kundli as KundliReady & { name?: string }).name ?? null
      : form.name || null;

  const inputClass =
    "w-full h-14 rounded-2xl px-4 outline-none border text-sm transition-colors focus:border-gold/60 bg-surface border-border text-foreground";

  // ── Loading ──
  if (kundliLoading && !hasFresh) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
            className="w-10 h-10 rounded-full border-2 border-gold border-t-transparent mx-auto"
          />
          <p className="text-sm text-muted mt-4">{t("kundli.pending")}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-28 bg-background">
      <TopBar 
         rightContent={<ViewModeToggle mode={viewMode} onChange={setViewMode} />} 
      />
      <div className="px-5 pt-4 max-w-lg mx-auto space-y-4">

        {/* ── CHART VIEW ── */}
        {hasData && chartData && (
          <div className="space-y-4">
            {/* 1. Header card */}
            {(ascendant || planets.length > 0) && (
              <KundliHeaderCard
                name={displayName}
                planets={planets}
                ascendant={ascendant}
              />
            )}

            {/* 2. Chart at the top */}
            <Card className="p-4">
              <div className="flex justify-center gap-2 mb-4">
                {(["north", "south"] as ChartStyle[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setChartStyle(s)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                      chartStyle === s
                        ? "bg-gold text-black"
                        : "bg-gold/10 text-gold/60"
                    }`}
                  >
                    {s === "north" ? "North Indian" : "South Indian"}
                  </button>
                ))}
              </div>
              <div className="max-w-[380px] mx-auto">
                {chartStyle === "north" ? (
                  <NorthIndianChart 
                     chartData={{ houses, planets }} 
                     title="Lagna (D1)" 
                     showMeanings 
                     onHouseClick={(houseNum) => {
                        const h = houses.find((x) => x.house === houseNum);
                        if (!h) return;
                        setSelectedHouse(h);
                        setIsDrawerOpen(true);
                     }}
                  />
                ) : (
                  <SouthIndianChart 
                     chartData={{ houses, planets }} 
                     title="Lagna (D1)" 
                     onHouseClick={(houseNum) => {
                        const h = houses.find((x) => x.house === houseNum);
                        if (!h) return;
                        setSelectedHouse(h);
                        setIsDrawerOpen(true);
                     }}
                  />
                )}
              </div>
            </Card>

            {viewMode === "plain" ? (
              <>
                {/* House Grid with Credits */}
                {houses.length > 0 && (
                  <HouseGrid 
                    houses={houses} 
                    unlockedHouses={unlockedHouses}
                    credits={credits}
                    onHouseClick={(h) => {
                      setSelectedHouse(h);
                      setIsDrawerOpen(true);
                    }}
                  />
                )}

                {/* Current Dasha */}
                {dasha && <PlainDashaCard dasha={dasha} />}
                
                {/* Yogas & Doshas */}
                <YogaDoshaSection yogas={yogas} doshas={doshas} mode={viewMode} />
                
                {/* Unlock Drawer */}
                <HouseUnlockDrawer
                  isOpen={isDrawerOpen}
                  onClose={() => setIsDrawerOpen(false)}
                  house={selectedHouse}
                  credits={credits}
                  unlockCost={UNLOCK_COST}
                  isUnlocked={selectedHouse ? unlockedHouses.includes(selectedHouse.house) : false}
                  onUnlock={async (houseNum) => {
                    await api.unlockHouse(houseNum);
                    await refreshUser();
                  }}
                />
              </>
            ) : (
              <>
                {dasha && <DashaTimeline dasha={dasha} />}
                <YogaDoshaSection yogas={yogas} doshas={doshas} mode={viewMode} />
                {planets.length > 0 && <PlanetsTable planets={planets} />}
                {houses.length > 0 && (
                  <HouseGrid 
                    houses={houses} 
                    unlockedHouses={unlockedHouses}
                    credits={credits}
                    onHouseClick={(h) => {
                      setSelectedHouse(h);
                      setIsDrawerOpen(true);
                    }}
                  />
                )}
              </>
            )}

            {/* 7. Divisional charts — Technical only */}
            {viewMode === "technical" && Object.keys(divisionalCharts).length > 0 && (
              <VargaChartTabs divisionalCharts={divisionalCharts} />
            )}
          </div>
        )}

        {/* ── FORM (no chart yet) ── */}
        {!hasData && (
          <>
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold text-center text-gold font-display"
            >
              {t("kundliPage.generateBtn")}
            </motion.h1>
            <p className="text-center text-sm text-muted mt-2">
              {t("kundliPage.subtitleLookup")}
            </p>

            <div className="mt-8 space-y-4">
              <input
                placeholder={t("kundliPage.fullName")}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputClass}
              />
              <div>
                <label className="text-xs text-muted ml-1 mb-1 block">{t("kundliPage.dob")}</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs text-muted ml-1 mb-1 block">{t("kundliPage.tob")}</label>
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  className={inputClass}
                />
              </div>
              <PlaceAutocomplete
                placeholder={t("kundliPage.birthPlace")}
                inputClassName={inputClass}
                onSelect={(place) => {
                  setResolvedPlace(place);
                  setForm((f) => ({ ...f, place: place.name }));
                }}
              />
              <button
                onClick={handleGenerate}
                disabled={!form.name || !form.date || generating}
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold disabled:opacity-40 transition-opacity"
              >
                {generating ? t("kundliPage.computing") : t("kundliPage.generateBtn")}
              </button>
            </div>

            {formError && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 rounded-2xl border border-red-500/30 text-red-400 text-sm bg-surface"
              >
                {formError}
              </motion.div>
            )}

            {generating && (
              <div className="mt-8 flex justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                  className="w-10 h-10 rounded-full border-2 border-gold border-t-transparent"
                />
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
