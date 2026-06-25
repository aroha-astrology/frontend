"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { matchmaking, type MatchmakingResponse, type BirthInput } from "@/lib/swarm-api";
import PlaceAutocomplete from "@/components/PlaceAutocomplete";
import type { PlaceOfBirth } from "@/lib/api";

interface PersonForm {
  name: string;
  dob: string;
  time: string;
  place: string;
}

interface CompatForm {
  boy: PersonForm;
  girl: PersonForm;
}

const emptyPerson: PersonForm = { name: "", dob: "", time: "", place: "" };

export default function CompatibilityPage() {
  const [form, setForm] = useState<CompatForm>({
    boy: { ...emptyPerson },
    girl: { ...emptyPerson },
  });
  const [resolvedBoyPlace, setResolvedBoyPlace] = useState<PlaceOfBirth | null>(null);
  const [resolvedGirlPlace, setResolvedGirlPlace] = useState<PlaceOfBirth | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MatchmakingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updatePerson = (who: "boy" | "girl", field: keyof PersonForm, value: string) => {
    setForm((prev) => ({
      ...prev,
      [who]: { ...prev[who], [field]: value },
    }));
  };

  const check = async () => {
    if (!form.boy.name || !form.girl.name || !form.boy.dob || !form.girl.dob) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const geo1 = resolvedBoyPlace ?? { lat: 28.6139, lon: 77.209, tz: "Asia/Kolkata" };
      const geo2 = resolvedGirlPlace ?? { lat: 28.6139, lon: 77.209, tz: "Asia/Kolkata" };

      const person1: BirthInput = {
        date: form.boy.dob,
        time: form.boy.time || "12:00",
        latitude: geo1.lat,
        longitude: geo1.lon,
        timezone: geo1.tz,
      };

      const person2: BirthInput = {
        date: form.girl.dob,
        time: form.girl.time || "12:00",
        latitude: geo2.lat,
        longitude: geo2.lon,
        timezone: geo2.tz,
      };

      const response = await matchmaking(person1, person2);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check compatibility. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const compat = result?.compatibility;
  const totalScore = compat?.totalScore ?? 0;
  const maxTotal = compat?.maxTotal ?? 36;
  const pct = maxTotal > 0 ? Math.round((totalScore / maxTotal) * 100) : 0;

  const verdictColor =
    pct >= 75 ? "text-green-400" : pct >= 50 ? "text-yellow-400" : "text-red-400";
  const verdictLabel =
    pct >= 75 ? "Excellent Match" : pct >= 50 ? "Good Match" : "Needs Attention";

  const inputClass =
    "w-full h-14 rounded-2xl px-4 outline-none border text-sm focus:border-yellow-500/60 transition-colors";
  const style = { background: "var(--surface)", borderColor: "var(--border)", color: "var(--foreground)" };

  const renderPersonFields = (who: "boy" | "girl", label: string) => (
    <div className="space-y-3">
      <p className="text-xs text-[var(--text-muted)] ml-1">{label}</p>
      <input
        placeholder="Name"
        value={form[who].name}
        onChange={(e) => updatePerson(who, "name", e.target.value)}
        className={inputClass}
        style={style}
      />
      <div>
        <label className="text-xs text-[var(--text-muted)] ml-1 mb-1 block">Date of Birth</label>
        <input
          type="date"
          value={form[who].dob}
          onChange={(e) => updatePerson(who, "dob", e.target.value)}
          className={inputClass}
          style={style}
        />
      </div>
      <div>
        <label className="text-xs text-[var(--text-muted)] ml-1 mb-1 block">Time of Birth</label>
        <input
          type="time"
          value={form[who].time}
          onChange={(e) => updatePerson(who, "time", e.target.value)}
          className={inputClass}
          style={style}
        />
      </div>
      <PlaceAutocomplete
        placeholder="Birth Place (City)"
        inputClassName={inputClass}
        inputStyle={style}
        onSelect={(place) => {
          updatePerson(who, "place", place.name);
          if (who === "boy") setResolvedBoyPlace(place);
          else setResolvedGirlPlace(place);
        }}
      />
    </div>
  );

  return (
    <main className="min-h-screen pb-28" style={{ background: "var(--background)" }}>
      <div className="px-5 pt-10">
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-3xl font-bold text-center text-gold font-display"
        >
          ❤️ Kundli Matching
        </motion.h1>
        <p className="text-center text-sm text-[var(--text-muted)] mt-2">
          Find your cosmic compatibility score
        </p>

        <div className="mt-8 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {renderPersonFields("boy", "Boy")}
            {renderPersonFields("girl", "Girl")}
          </div>

          <button
            onClick={check}
            disabled={!form.boy.name || !form.girl.name || !form.boy.dob || !form.girl.dob || loading}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold disabled:opacity-40 transition-opacity"
          >
            {loading ? "Computing..." : "Check Compatibility"}
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
        {result && compat && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 p-6 rounded-3xl border"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gold font-display">
                  {totalScore} / {maxTotal} Gunas
                </h2>
                <p className={`${verdictColor} text-sm font-medium mt-0.5`}>
                  {compat.overallCompatibility || verdictLabel}{" "}
                  {pct >= 50 ? "✓" : ""}
                </p>
              </div>
              <div className="text-4xl">💍</div>
            </div>

            <div className="h-3 rounded-full" style={{ background: "var(--secondary)" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 1, delay: 0.2 }}
                className="h-3 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full"
              />
            </div>

            {/* Koota scores */}
            <div className="mt-5 space-y-3 text-sm" style={{ color: "var(--text-muted)" }}>
              {compat.scores.map((koota) => (
                <div key={koota.koota} className="flex justify-between">
                  <span>{koota.koota}</span>
                  <span className="text-gold font-medium">
                    {koota.score}/{koota.maxScore}
                    {koota.compatibility && (
                      <span className="text-[var(--text-muted)] ml-1 text-xs">
                        ({koota.compatibility})
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>

            <p className="mt-4 text-sm text-[var(--text-muted)] leading-relaxed">
              {form.boy.name} and {form.girl.name} scored {totalScore} out of {maxTotal} Gunas in the Ashtakoota compatibility analysis.
            </p>

            {/* Warnings */}
            {result.warnings && result.warnings.length > 0 && (
              <div className="mt-3 text-xs text-yellow-500">
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
