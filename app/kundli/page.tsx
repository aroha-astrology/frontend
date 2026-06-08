"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AppHeader from "@/components/AppHeader";
import { KundliChart } from "@/components/icons/KundliChart";

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

const signCards = [
  { label: "Moon Sign", value: "Cancer", icon: "🌙" },
  { label: "Sun Sign", value: "Leo", icon: "☀️" },
  { label: "Ascendant", value: "Virgo", icon: "🪐" },
  { label: "Nakshatra", value: "Pushya", icon: "🌟" },
  { label: "Dasha", value: "Jupiter", icon: "♃" },
  { label: "Rashi", value: "Karka", icon: "♋" },
];

const scoreBars = [
  { label: "Career", score: 8, max: 10 },
  { label: "Marriage", score: 7, max: 10 },
  { label: "Wealth", score: 7.5, max: 10 },
];

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
      <AppHeader />
      <div className="pt-14">
        {/* Page header */}
        <div className="text-center pt-10 px-5 mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-[10px] font-display tracking-[0.35em] text-[var(--text-muted)] uppercase">
              ✦ Vedic Chart ✦
            </span>
          </div>
          <h1
            className="font-editorial text-4xl font-semibold"
            style={{ color: "var(--gold)", fontStyle: "italic" }}
          >
            Generate Kundli
          </h1>
          <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
            Enter your birth details for your Vedic birth chart
          </p>
        </div>

        {/* Form card */}
        <div
          className="mx-5 p-5 rounded-3xl border"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <motion.div
            className="space-y-4"
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
                  className="w-full h-14 rounded-xl px-4 outline-none border text-sm focus:border-[var(--gold)] transition-colors"
                  style={inputStyle}
                />
              </motion.div>
            ))}

            {/* Generate button */}
            <motion.div
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
            >
              <button
                onClick={handleGenerate}
                disabled={!form.name || !form.date || loading}
                className="shimmer-btn w-full h-14 rounded-2xl font-bold disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #D4AF37 0%, #F4D675 50%, #D4AF37 100%)", color: "#05060A" }}
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
        </div>

        {/* Results section */}
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
                className="mx-5 mt-5 p-5 rounded-3xl border"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              >
                {/* Heading row */}
                <div className="flex items-baseline justify-between mb-1">
                  <h3
                    className="font-editorial text-2xl font-semibold"
                    style={{ color: "var(--gold)", fontStyle: "italic" }}
                  >
                    Kundli Report
                  </h3>
                  <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                    {form.name}
                  </span>
                </div>
                <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
                  {form.date}
                  {form.time && ` · ${form.time}`}
                  {form.place && ` · ${form.place}`}
                </p>

                {/* Visual chart */}
                <div className="flex justify-center mb-6">
                  <div
                    className="relative"
                    style={{
                      filter: "drop-shadow(0 0 18px rgba(212,175,55,0.35))",
                    }}
                  >
                    <KundliChart size={160} color="#D4AF37" className="opacity-70" />
                  </div>
                </div>

                {/* Sign cards grid */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {signCards.map(({ label, value, icon }, i) => (
                    <motion.div
                      key={label}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 + i * 0.07 }}
                      className="rounded-2xl p-3 text-center border"
                      style={{ background: "rgba(212,175,55,0.05)", borderColor: "rgba(212,175,55,0.15)" }}
                    >
                      <span className="text-lg">{icon}</span>
                      <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>{label}</p>
                      <p className="text-xs font-semibold mt-0.5" style={{ color: "var(--gold)" }}>{value}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Score bars */}
                <div className="space-y-3 mb-5">
                  {scoreBars.map(({ label, score, max }, i) => (
                    <motion.div
                      key={label}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                    >
                      <div className="flex justify-between text-xs mb-1.5">
                        <span style={{ color: "var(--text-muted)" }}>{label}</span>
                        <span style={{ color: "var(--gold)" }}>{score} / {max}</span>
                      </div>
                      <div
                        className="h-1.5 rounded-full overflow-hidden"
                        style={{ background: "rgba(212,175,55,0.1)" }}
                      >
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(score / max) * 100}%` }}
                          transition={{ duration: 1, delay: 0.4 + i * 0.1, ease: "easeOut" }}
                          className="h-full rounded-full"
                          style={{ background: "linear-gradient(90deg, #D4AF37, #F4D675)" }}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Insights */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--text-muted)" }}
                >
                  Your chart reveals a powerful Cancer Moon softened by a Leo Sun, bringing emotional depth and natural leadership. Jupiter's placement in the 10th house favours career prominence and spiritual wisdom throughout this lifetime.
                </motion.p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.main>
  );
}
