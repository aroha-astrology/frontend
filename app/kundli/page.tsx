"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { onboarding, type OnboardingResponse, type BirthInput } from "@/lib/swarm-api";
import { useKundli } from "@/hooks/useKundli";
import PlaceAutocomplete from "@/components/PlaceAutocomplete";
import type { Kundli, PlaceOfBirth } from "@/lib/api";

interface FormData {
  name: string;
  date: string;
  time: string;
  place: string;
}

const inputClass =
  "w-full h-14 rounded-2xl px-4 outline-none border text-sm transition-colors focus:border-yellow-500/60";
const inputStyle = { background: "var(--surface)", borderColor: "var(--border)", color: "var(--foreground)" };

/** Planet row shape shared by both the own-kundli path and the onboarding-lookup path. */
interface PlanetRow {
  planet: string;
  sign: string;
  house?: number;
  nakshatra?: string;
  nakshatraPada?: number;
  isRetrograde?: boolean;
}

function extractOwnKundli(kundli: Kundli) {
  const chart = kundli.chart as Record<string, unknown> | null;
  const asc = chart?.ascendant as Record<string, unknown> | undefined;
  const ascendantSign = (asc?.ascendantSign ?? asc?.sign ?? null) as string | null;
  const ascendantDegree = (asc?.ascendantDegree ?? asc?.degree ?? null) as number | null;

  const planets: PlanetRow[] = ((chart?.planets ?? []) as Array<Record<string, unknown>>).map((p) => ({
    planet: String(p.planet ?? ""),
    sign: String(p.sign ?? ""),
    house: Number(p.house ?? 0),
    nakshatra: String(p.nakshatra ?? ""),
    nakshatraPada: Number(p.nakshatraPada ?? 0),
    isRetrograde: Boolean(p.isRetrograde),
  }));

  const dasha = kundli.dasha as Record<string, unknown> | null;
  const maha = dasha?.currentMahadasha as Record<string, unknown> | undefined;
  const antar = dasha?.currentAntardasha as Record<string, unknown> | undefined;

  return { ascendantSign, ascendantDegree, planets, maha, antar };
}

function extractLookupResult(result: OnboardingResponse) {
  const charts = result.charts;
  const planets: PlanetRow[] = (charts?.planets ?? []).map((p) => ({
    planet: p.planet,
    sign: p.sign,
    house: p.house,
    nakshatra: p.nakshatra,
    nakshatraPada: p.nakshatraPada,
    isRetrograde: p.isRetrograde,
  }));
  const asc = charts?.chart?.ascendant;
  const ascendantSign = (asc?.ascendantSign ?? asc?.sign ?? null) ?? null;
  const ascendantDegree = (asc?.ascendantDegree ?? asc?.degree ?? null) ?? null;
  const maha = charts?.dasha?.currentMahadasha;
  const antar = charts?.dasha?.currentAntardasha;

  return { ascendantSign, ascendantDegree, planets, maha, antar };
}

function dashaLabel(period?: { planet?: string; lord?: string; start?: string; end?: string }) {
  if (!period) return null;
  return {
    name: period.lord ?? period.planet ?? "",
    range: period.start && period.end ? `${period.start} to ${period.end}` : null,
  };
}

export default function KundliPage() {
  const { t } = useTranslation();
  const { kundli, loading: ownLoading, error: ownError } = useKundli();

  const [checkingOther, setCheckingOther] = useState(false);
  const [form, setForm] = useState<FormData>({ name: "", date: "", time: "", place: "" });
  const [resolvedPlace, setResolvedPlace] = useState<PlaceOfBirth | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<OnboardingResponse | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!form.name || !form.date) return;

    setLookupLoading(true);
    setLookupError(null);
    setLookupResult(null);

    try {
      const geo = resolvedPlace ?? { lat: 28.6139, lon: 77.209, tz: "Asia/Kolkata" };

      const birth: BirthInput = {
        date: form.date,
        time: form.time || "12:00",
        latitude: geo.lat,
        longitude: geo.lon,
        timezone: geo.tz,
      };

      const response = await onboarding(birth);
      setLookupResult(response);
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : t("kundliPage.generateError"));
    } finally {
      setLookupLoading(false);
    }
  };

  const own = kundli ? extractOwnKundli(kundli) : null;
  const lookup = lookupResult ? extractLookupResult(lookupResult) : null;
  const maha = dashaLabel(own?.maha ?? lookup?.maha);
  const antar = dashaLabel(own?.antar ?? lookup?.antar);

  return (
    <main className="min-h-screen pb-28" style={{ background: "var(--background)" }}>
      <div className="px-5 pt-10">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-center text-gold font-display"
        >
          📜 {t("kundliPage.title")}
        </motion.h1>
        <p className="text-center text-sm text-[var(--text-muted)] mt-2">
          {checkingOther ? t("kundliPage.subtitleLookup") : t("kundliPage.subtitleOwn")}
        </p>

        <div className="mt-6 flex justify-center">
          <button
            onClick={() => setCheckingOther((v) => !v)}
            className="text-xs text-gold underline underline-offset-2"
          >
            {checkingOther ? t("kundliPage.backToMine") : t("kundliPage.checkAnother")}
          </button>
        </div>

        {/* ── Own kundli ─────────────────────────────────────────────── */}
        {!checkingOther && (
          <div className="mt-6">
            {ownLoading && (
              <div className="flex justify-center py-10">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                  className="w-10 h-10 rounded-full border-2 border-yellow-500 border-t-transparent"
                />
              </div>
            )}

            {!ownLoading && ownError && (
              <div className="mt-6 p-4 rounded-2xl border border-red-500/30 text-red-400 text-sm">
                {ownError}
              </div>
            )}

            {!ownLoading && !ownError && !kundli && (
              <div className="mt-8 p-6 rounded-3xl border text-center text-sm" style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text-muted)" }}>
                {t("kundliPage.noProfileYet")}
              </div>
            )}

            {!ownLoading && kundli && own && (
              <>
                {kundli.timeKnown === false && (
                  <div className="mt-4 p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-400 text-xs">
                    ⚠ {t("kundliPage.timeUnknownNote")}
                  </div>
                )}
                <ResultCard
                  title={t("kundliPage.reportTitle")}
                  subtitle={kundli.generatedAt ?? ""}
                  ascendantSign={own.ascendantSign}
                  ascendantDegree={own.ascendantDegree}
                  planets={own.planets}
                  maha={maha}
                  antar={antar}
                  t={t}
                />
              </>
            )}
          </div>
        )}

        {/* ── Look up another chart ──────────────────────────────────── */}
        {checkingOther && (
          <div className="mt-6 space-y-4">
            <input
              placeholder={t("kundliPage.fullName")}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass}
              style={inputStyle}
            />
            <div>
              <label className="text-xs text-[var(--text-muted)] ml-1 mb-1 block">{t("kundliPage.dob")}</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] ml-1 mb-1 block">{t("kundliPage.tob")}</label>
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <PlaceAutocomplete
              placeholder={t("kundliPage.birthPlace")}
              inputClassName={inputClass}
              inputStyle={inputStyle}
              onSelect={(place) => {
                setResolvedPlace(place);
                setForm((f) => ({ ...f, place: place.name }));
              }}
            />

            <button
              onClick={handleGenerate}
              disabled={!form.name || !form.date || lookupLoading}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold disabled:opacity-40 transition-opacity"
            >
              {lookupLoading ? t("kundliPage.computing") : t("kundliPage.generateBtn")}
            </button>

            {lookupError && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl border border-red-500/30 text-red-400 text-sm"
                style={{ background: "var(--surface)" }}
              >
                {lookupError}
              </motion.div>
            )}

            {lookupLoading && (
              <div className="flex justify-center py-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                  className="w-10 h-10 rounded-full border-2 border-yellow-500 border-t-transparent"
                />
              </div>
            )}

            <AnimatePresence>
              {lookupResult && lookup && (
                <ResultCard
                  title={`${t("kundliPage.reportTitle")} — ${form.name}`}
                  subtitle={`${form.date} ${form.time && `· ${form.time}`} ${form.place && `· ${form.place}`}`}
                  ascendantSign={lookup.ascendantSign}
                  ascendantDegree={lookup.ascendantDegree}
                  planets={lookup.planets}
                  maha={maha}
                  antar={antar}
                  insights={lookupResult.insights}
                  t={t}
                />
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </main>
  );
}

function ResultCard({
  title,
  subtitle,
  ascendantSign,
  ascendantDegree,
  planets,
  maha,
  antar,
  insights,
  t,
}: {
  title: string;
  subtitle: string;
  ascendantSign: string | null;
  ascendantDegree: number | null;
  planets: PlanetRow[];
  maha: { name: string; range: string | null } | null;
  antar: { name: string; range: string | null } | null;
  insights?: string[];
  t: (key: string) => string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-2 p-6 rounded-3xl border"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <h3 className="text-xl font-semibold text-gold font-display">{title}</h3>
      {subtitle && <p className="text-xs text-[var(--text-muted)] mt-1">{subtitle}</p>}

      {ascendantSign && (
        <div className="mt-5 mb-4">
          <div className="flex justify-between text-sm" style={{ color: "var(--text-muted)" }}>
            <span>🪐 {t("kundliPage.ascendantLagna")}</span>
            <span className="text-gold font-medium">
              {ascendantSign}
              {ascendantDegree != null && ` (${ascendantDegree.toFixed(1)}°)`}
            </span>
          </div>
        </div>
      )}

      {planets.length > 0 && (
        <div className="space-y-3 text-sm" style={{ color: "var(--text-muted)" }}>
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mt-2">
            {t("kundliPage.planetPositions")}
          </p>
          {planets.map((p) => (
            <div key={p.planet} className="flex justify-between">
              <span>
                {p.planet}
                {p.isRetrograde && <span className="text-red-400 text-xs ml-1">(R)</span>}
              </span>
              <span className="text-gold font-medium">
                {p.sign} {p.house != null && `· ${t("kundliPage.house")} ${p.house}`}
                {p.nakshatra && (
                  <span className="text-[var(--text-muted)] ml-1 text-xs">
                    ({p.nakshatra} {p.nakshatraPada})
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {(maha || antar) && (
        <div className="mt-5 space-y-3 text-sm" style={{ color: "var(--text-muted)" }}>
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            {t("kundliPage.currentDasha")}
          </p>
          {maha && (
            <div className="flex justify-between">
              <span>{t("kundliPage.mahadasha")}</span>
              <span className="text-gold font-medium">
                {maha.name}
                {maha.range && <span className="text-[var(--text-muted)] ml-1 text-xs">({maha.range})</span>}
              </span>
            </div>
          )}
          {antar && (
            <div className="flex justify-between">
              <span>{t("kundliPage.antardasha")}</span>
              <span className="text-gold font-medium">
                {antar.name}
                {antar.range && <span className="text-[var(--text-muted)] ml-1 text-xs">({antar.range})</span>}
              </span>
            </div>
          )}
        </div>
      )}

      {insights && insights.length > 0 && (
        <div className="mt-4 space-y-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
          {insights.map((i, idx) => (
            <p key={idx}>✦ {i}</p>
          ))}
        </div>
      )}
    </motion.div>
  );
}
