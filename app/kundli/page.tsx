"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface FormData {
  name: string;
  date: string;
  time: string;
  place: string;
}

export default function KundliPage() {
  const [form, setForm] = useState<FormData>({ name: "", date: "", time: "", place: "" });
  const [generated, setGenerated] = useState(false);

  const handleGenerate = () => {
    if (!form.name || !form.date) return;
    setGenerated(true);
  };

  const inputClass =
    "w-full h-14 rounded-2xl px-4 outline-none border text-sm transition-colors focus:border-yellow-500/60";

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
          <input
            placeholder="Birth Place (City, Country)"
            value={form.place}
            onChange={(e) => setForm({ ...form, place: e.target.value })}
            className={inputClass}
            style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--foreground)" }}
          />

          <button
            onClick={handleGenerate}
            disabled={!form.name || !form.date}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold disabled:opacity-40 transition-opacity"
          >
            Generate Kundli
          </button>
        </div>

        {generated && (
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
            <div className="mt-5 space-y-3 text-sm" style={{ color: "var(--text-muted)" }}>
              {[
                { label: "🌙 Moon Sign", value: "Cancer" },
                { label: "☀️ Sun Sign", value: "Leo" },
                { label: "🪐 Ascendant", value: "Virgo" },
                { label: "🌟 Nakshatra", value: "Pushya" },
                { label: "💼 Career Score", value: "8 / 10" },
                { label: "❤️ Marriage Score", value: "7 / 10" },
                { label: "💰 Wealth Score", value: "7.5 / 10" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span>{label}</span>
                  <span className="text-gold font-medium">{value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}
