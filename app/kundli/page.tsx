"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { onboarding, type OnboardingResponse, type BirthInput } from "@/lib/swarm-api";
import PlaceAutocomplete from "@/components/PlaceAutocomplete";
import type { PlaceOfBirth } from "@/lib/api";

interface FormData {
  name: string;
  date: string;
  time: string;
  place: string;
}

export default function KundliPage() {
  const [form, setForm] = useState<FormData>({ name: "", date: "", time: "", place: "" });
  const [resolvedPlace, setResolvedPlace] = useState<PlaceOfBirth | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OnboardingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!form.name || !form.date) return;

    setLoading(true);
    setError(null);
    setResult(null);

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
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate kundli. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full h-14 rounded-2xl px-4 outline-none border text-sm transition-colors focus:border-yellow-500/60";

  const metrology = result?.metrology;
  const planets = metrology?.planets ?? [];
  const ascendant = metrology?.ascendant;
  const dasha = metrology?.vimshottariDasha;

  return (
    <main className="min-h-screen pb-28" style={{ background: "var(--background)" }}>
      <div className="px-5 pt-10">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-center text-gold font-display"
        >
          📜 Generate Kundli
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
            disabled={!form.name || !form.date || loading}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold disabled:opacity-40 transition-opacity"
          >
            {loading ? "Computing..." : "Generate Kundli"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 rounded-2xl border border-red-500/30 text-red-400 text-sm"
            style={{ background: "var(--surface)" }}
          >
            {error}
          </motion.div>
        )}

        {/* Loading spinner */}
        {loading && (
          <div className="mt-8 flex justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
              className="w-10 h-10 rounded-full border-2 border-yellow-500 border-t-transparent"
            />
          </div>
        )}

        {/* Results */}
        {result && metrology && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 p-6 rounded-3xl border"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <h3 className="text-xl font-semibold text-gold font-display">
              Kundli Report — {form.name}
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {form.date} {form.time && `· ${form.time}`} {form.place && `· ${form.place}`}
            </p>

            {/* Ascendant */}
            {ascendant && (
              <div className="mt-5 mb-4">
                <div className="flex justify-between text-sm" style={{ color: "var(--text-muted)" }}>
                  <span>🪐 Ascendant (Lagna)</span>
                  <span className="text-gold font-medium">
                    {ascendant.ascendantSign} ({ascendant.ascendantDegree.toFixed(1)}°)
                  </span>
                </div>
              </div>
            )}

            {/* Planet positions */}
            <div className="space-y-3 text-sm" style={{ color: "var(--text-muted)" }}>
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mt-2">
                Planet Positions
              </p>
              {planets.map((p) => (
                <div key={p.planet} className="flex justify-between">
                  <span>
                    {p.planet}
                    {p.isRetrograde && <span className="text-red-400 text-xs ml-1">(R)</span>}
                  </span>
                  <span className="text-gold font-medium">
                    {p.sign} · House {p.house}
                    <span className="text-[var(--text-muted)] ml-1 text-xs">
                      ({p.nakshatra} {p.nakshatraPada})
                    </span>
                  </span>
                </div>
              ))}
            </div>

            {/* Current Dasha */}
            {dasha && (
              <div className="mt-5 space-y-3 text-sm" style={{ color: "var(--text-muted)" }}>
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Current Dasha Period
                </p>
                {dasha.currentMahadasha && (
                  <div className="flex justify-between">
                    <span>Mahadasha</span>
                    <span className="text-gold font-medium">
                      {dasha.currentMahadasha.planet}
                      <span className="text-[var(--text-muted)] ml-1 text-xs">
                        ({dasha.currentMahadasha.start} to {dasha.currentMahadasha.end})
                      </span>
                    </span>
                  </div>
                )}
                {dasha.currentAntardasha && (
                  <div className="flex justify-between">
                    <span>Antardasha</span>
                    <span className="text-gold font-medium">
                      {dasha.currentAntardasha.planet}
                      <span className="text-[var(--text-muted)] ml-1 text-xs">
                        ({dasha.currentAntardasha.start} to {dasha.currentAntardasha.end})
                      </span>
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <div className="mt-4 text-xs text-yellow-500">
                {result.warnings.map((w, i) => (
                  <p key={i}>⚠ {w}</p>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </main>
  );
}
