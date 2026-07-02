"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { swarmApi, type BirthInput, type OnboardingResponse } from "@/lib/swarm-api";
import { useKundli } from "@/hooks/useKundli";
import PlaceAutocomplete from "@/components/PlaceAutocomplete";
import type { PlaceOfBirth } from "@/lib/api";
import Card from "@/components/ui/Card";
import NorthIndianChart from "@/components/ui/NorthIndianChart";
import SouthIndianChart from "@/components/ui/SouthIndianChart";
import PlanetsTable from "@/components/ui/PlanetsTable";
import HouseDetails from "@/components/ui/HouseDetails";
import DashaTimeline from "@/components/ui/DashaTimeline";
import YogaCard from "@/components/ui/YogaCard";
import DoshaCard from "@/components/ui/DoshaCard";
import VargaChartTabs from "@/components/ui/VargaChartTabs";

type ChartStyle = "north" | "south";

interface FormData {
  name: string;
  date: string;
  time: string;
  place: string;
}

// Normalize chart data from either the REST /v1/kundli or the swarm /v1/onboarding response
function normalizeChart(source: Record<string, any>): {
  planets: any[];
  houses: any[];
  ascendant: Record<string, any> | null;
  dasha: any | null;
  divisionalCharts: Record<string, any>;
  findings: any[];
} {
  // Swarm onboarding format (deployed): planets/houses/dasha live under `charts`.
  // REST kundli format: chart object with nested data. `metrology` is a legacy
  // alias kept for any older/local swarm responses still using that shape.
  const chart = source.charts ?? source.metrology ?? source.chart ?? source;
  return {
    planets: chart.planets ?? [],
    houses: chart.houses ?? [],
    // Deployed onboarding response nests ascendant one level deeper (charts.chart.ascendant).
    ascendant: chart.ascendant ?? chart.chart?.ascendant ?? null,
    dasha: chart.vimshottariDasha ?? chart.dasha ?? null,
    divisionalCharts: chart.divisionalCharts ?? {},
    findings: source.findings ?? [],
  };
}

export default function KundliPage() {
  // Try to load existing kundli first
  const { kundli, loading: kundliLoading, error: kundliError } = useKundli();

  // Form state (fallback for fresh generation)
  const [form, setForm] = useState<FormData>({ name: "", date: "", time: "", place: "" });
  const [resolvedPlace, setResolvedPlace] = useState<PlaceOfBirth | null>(null);
  const [generating, setGenerating] = useState(false);
  const [freshResult, setFreshResult] = useState<OnboardingResponse | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [chartStyle, setChartStyle] = useState<ChartStyle>("north");

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
      setFormError(err instanceof Error ? err.message : "Failed to generate kundli.");
    } finally {
      setGenerating(false);
    }
  };

  // Determine which data source to use
  const hasExisting = kundli?.status === "ready" && kundli.chart;
  const hasFresh = freshResult?.charts;
  const hasData = hasExisting || hasFresh;

  const chartData = hasExisting
    ? normalizeChart(kundli as any)
    : hasFresh
      ? normalizeChart(freshResult as any)
      : null;

  const { planets, houses, ascendant, dasha, divisionalCharts, findings } = chartData ?? {
    planets: [], houses: [], ascendant: null, dasha: null, divisionalCharts: {}, findings: [],
  };

  const yogas = findings.filter((f: any) => f.kind === "yoga");
  const doshas = findings.filter((f: any) => f.kind === "dosha");

  const inputClass =
    "w-full h-14 rounded-2xl px-4 outline-none border text-sm transition-colors focus:border-yellow-500/60";

  // Loading state
  if (kundliLoading && !hasFresh) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
            className="w-10 h-10 rounded-full border-2 border-yellow-500 border-t-transparent mx-auto"
          />
          <p className="text-sm text-[var(--text-muted)] mt-4">Loading your kundli...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-28" style={{ background: "var(--background)" }}>
      <div className="px-5 pt-10 max-w-lg mx-auto">

        {/* ── CHART VIEW (when data exists) ── */}
        {hasData && chartData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Header */}
            <div>
              <h1 className="text-2xl font-bold text-gold font-display">Your Kundli</h1>
              <p className="text-xs text-[var(--text-muted)] mt-1">Natal Birth Chart</p>
            </div>

            {/* Chart toggle + chart */}
            <Card className="p-4">
              <div className="flex justify-center gap-2 mb-4">
                <button
                  onClick={() => setChartStyle("north")}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    chartStyle === "north" ? "bg-primary text-black" : "bg-primary/10 text-primary/60"
                  }`}
                >
                  North Indian
                </button>
                <button
                  onClick={() => setChartStyle("south")}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    chartStyle === "south" ? "bg-primary text-black" : "bg-primary/10 text-primary/60"
                  }`}
                >
                  South Indian
                </button>
              </div>
              <div className="max-w-[380px] mx-auto">
                {chartStyle === "north" ? (
                  <NorthIndianChart chartData={{ houses, planets }} title="Rashi Chart (D1)" showMeanings />
                ) : (
                  <SouthIndianChart chartData={{ houses, planets }} title="Rashi Chart (D1)" />
                )}
              </div>
            </Card>

            {/* Basic details */}
            {ascendant && (
              <Card className="p-4">
                <h3 className="text-[10px] font-semibold tracking-[0.25em] uppercase text-primary mb-3 flex items-center gap-2">
                  <span className="text-accent text-xs">✦</span>
                  Basic Details
                  <span className="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-text-secondary">Ascendant</span>
                    <p className="text-primary font-semibold">{ascendant.ascendantSign ?? ascendant.sign}</p>
                  </div>
                  <div>
                    <span className="text-text-secondary">Moon Sign</span>
                    <p className="text-primary font-semibold">
                      {planets.find((p: any) => p.planet === "Moon")?.sign ?? "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-text-secondary">Sun Sign</span>
                    <p className="text-primary font-semibold">
                      {planets.find((p: any) => p.planet === "Sun")?.sign ?? "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-text-secondary">Nakshatra</span>
                    <p className="text-primary font-semibold">
                      {planets.find((p: any) => p.planet === "Moon")?.nakshatra ?? "—"}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {planets.length > 0 && <PlanetsTable planets={planets} />}
            {houses.length > 0 && <HouseDetails houses={houses} />}
            {dasha && <DashaTimeline dasha={dasha} />}
            {yogas.length > 0 && <Card className="p-4"><YogaCard yogas={yogas} /></Card>}
            {doshas.length > 0 && <Card className="p-4"><DoshaCard doshas={doshas} /></Card>}
            {Object.keys(divisionalCharts).length > 0 && <VargaChartTabs divisionalCharts={divisionalCharts} />}
          </motion.div>
        )}

        {/* ── FORM (fallback: only shown while there's no chart yet) ── */}
        {!hasData && (
          <>
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold text-center text-gold font-display"
            >
              Generate Kundli
            </motion.h1>
            <p className="text-center text-sm text-[var(--text-muted)] mt-2">
              Enter your birth details for your Vedic birth chart
            </p>

            <div className="mt-8 space-y-4">
              <input
                placeholder="Full Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputClass}
                style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--foreground)" }}
              />
              <div>
                <label className="text-xs text-[var(--text-muted)] ml-1 mb-1 block">Date of Birth</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className={inputClass}
                  style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--foreground)" }}
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)] ml-1 mb-1 block">Time of Birth</label>
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  className={inputClass}
                  style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--foreground)" }}
                />
              </div>
              <PlaceAutocomplete
                placeholder="Birth Place (City, Country)"
                inputClassName={inputClass}
                inputStyle={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--foreground)" }}
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
                {generating ? "Computing..." : "Generate Kundli"}
              </button>
            </div>

            {formError && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 rounded-2xl border border-red-500/30 text-red-400 text-sm"
                style={{ background: "var(--surface)" }}
              >
                {formError}
              </motion.div>
            )}

            {generating && (
              <div className="mt-8 flex justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                  className="w-10 h-10 rounded-full border-2 border-yellow-500 border-t-transparent"
                />
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
