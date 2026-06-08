"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface FormData {
  name: string;
  date: string;
  time: string;
  place: string;
}

const formFields = [
  { key: "name", label: "Full Name", type: "text", placeholder: "Full Name" },
  { key: "date", label: "Date of Birth", type: "date", placeholder: "" },
  { key: "time", label: "Time of Birth", type: "time", placeholder: "" },
  { key: "place", label: "Birth Place", type: "text", placeholder: "City, Country" },
] as const;

export default function KundliPage() {
  const [form, setForm] = useState<FormData>({ name: "", date: "", time: "", place: "" });
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const handleGenerate = async () => {
    if (!form.name || !form.date) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1400));
    setLoading(false);
    setGenerated(true);
  };

  const inputStyle = {
    background: "var(--surface)",
    borderColor: "var(--border)",
    color: "var(--foreground)",
  };

  return (
    <motion.main
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen pb-28"
      style={{ background: "var(--background)" }}
    >
      <div className="px-5 pt-10">
        <h1 className="text-3xl font-bold text-center text-gold font-display">
          📜 Generate Kundli
        </h1>
        <p className="text-center text-sm mt-2" style={{ color: "var(--text-muted)" }}>
          Enter your birth details for your Vedic birth chart
        </p>

        {/* Staggered form fields */}
        <motion.div
          className="mt-8 space-y-4"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        >
          {formFields.map(({ key, label, type, placeholder }) => (
            <motion.div
              key={key}
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
            >
              {type !== "text" && (
                <label className="text-xs ml-1 mb-1 block" style={{ color: "var(--text-muted)" }}>
                  {label}
                </label>
              )}
              <input
                type={type}
                placeholder={placeholder || label}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="w-full h-14 rounded-2xl px-4 outline-none border text-sm focus:border-yellow-500/60 transition-colors"
                style={inputStyle}
              />
            </motion.div>
          ))}

          {/* Generate button with shimmer + loading state */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
          >
            <button
              onClick={handleGenerate}
              disabled={!form.name || !form.date || loading}
              className="shimmer-btn w-full h-14 rounded-2xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
                  Generating…
                </>
              ) : (
                "Generate Kundli"
              )}
            </button>
          </motion.div>
        </motion.div>

        {/* Expanding result card */}
        <AnimatePresence>
          {generated && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div
                className="mt-6 p-6 rounded-3xl border"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              >
                <h3 className="text-xl font-semibold text-gold font-display">
                  Kundli Report — {form.name}
                </h3>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
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
                  ].map(({ label, value }, i) => (
                    <motion.div
                      key={label}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.07 }}
                      className="flex justify-between"
                    >
                      <span>{label}</span>
                      <span className="text-gold font-medium">{value}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.main>
  );
}
