"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AppHeader from "@/components/AppHeader";

interface CompatForm {
  boyName: string;
  girlName: string;
  boyDob: string;
  girlDob: string;
}

const TARGET_GUNAS = 28;

export default function CompatibilityPage() {
  const [form, setForm] = useState<CompatForm>({ boyName: "", girlName: "", boyDob: "", girlDob: "" });
  const [result, setResult] = useState(false);
  const [counter, setCounter] = useState(0);

  const pct = Math.round((TARGET_GUNAS / 36) * 100);

  /* Animate score counter 0→28 */
  useEffect(() => {
    if (!result) return;
    setCounter(0);
    let current = 0;
    const step = () => {
      current++;
      setCounter(current);
      if (current < TARGET_GUNAS) setTimeout(step, 50);
    };
    setTimeout(step, 300);
  }, [result]);

  const inputClass =
    "w-full h-14 rounded-xl px-4 outline-none border text-sm focus:border-[var(--gold)] transition-colors";
  const iStyle = {
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
          <span className="text-[10px] font-display tracking-[0.35em] text-[var(--text-muted)] uppercase">
            ✦ Vedic Match ✦
          </span>
          <h1
            className="font-editorial text-4xl font-semibold mt-1"
            style={{ color: "var(--gold)", fontStyle: "italic" }}
          >
            Match Making
          </h1>
          <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
            Find your cosmic compatibility score
          </p>
        </div>

        {/* Form card */}
        <div
          className="mx-5 p-5 rounded-3xl border"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Boy column */}
            <div className="space-y-3">
              <p
                className="text-[10px] font-display tracking-[0.2em] uppercase ml-1"
                style={{ color: "var(--text-muted)" }}
              >
                Boy
              </p>
              <input
                placeholder="Name"
                value={form.boyName}
                onChange={(e) => setForm({ ...form, boyName: e.target.value })}
                className={inputClass}
                style={iStyle}
              />
              <input
                type="date"
                value={form.boyDob}
                onChange={(e) => setForm({ ...form, boyDob: e.target.value })}
                className={inputClass}
                style={iStyle}
              />
            </div>

            {/* Girl column */}
            <div className="space-y-3">
              <p
                className="text-[10px] font-display tracking-[0.2em] uppercase ml-1"
                style={{ color: "var(--text-muted)" }}
              >
                Girl
              </p>
              <input
                placeholder="Name"
                value={form.girlName}
                onChange={(e) => setForm({ ...form, girlName: e.target.value })}
                className={inputClass}
                style={iStyle}
              />
              <input
                type="date"
                value={form.girlDob}
                onChange={(e) => setForm({ ...form, girlDob: e.target.value })}
                className={inputClass}
                style={iStyle}
              />
            </div>
          </div>

          {/* Gold divider */}
          <div
            className="h-px mb-4"
            style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.3), transparent)" }}
          />

          <button
            onClick={() => {
              if (form.boyName && form.girlName) setResult(true);
            }}
            disabled={!form.boyName || !form.girlName}
            className="shimmer-btn w-full h-14 rounded-2xl font-bold disabled:opacity-40 transition-opacity"
            style={{ background: "linear-gradient(135deg, #D4AF37 0%, #F4D675 50%, #D4AF37 100%)", color: "#05060A" }}
          >
            Check Compatibility
          </button>
        </div>

        {/* Results section */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mx-5 mt-5 p-5 rounded-3xl border"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              {/* Animated circular progress ring */}
              <div className="flex justify-center mb-4">
                <div className="relative w-32 h-32">
                  <svg width="128" height="128" viewBox="0 0 128 128">
                    {/* Background ring */}
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      fill="none"
                      stroke="rgba(212,175,55,0.1)"
                      strokeWidth="8"
                    />
                    {/* Progress ring */}
                    <motion.circle
                      cx="64"
                      cy="64"
                      r="56"
                      fill="none"
                      stroke="url(#goldGradient)"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 56}`}
                      initial={{ strokeDashoffset: 2 * Math.PI * 56 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 56 * (1 - pct / 100) }}
                      transition={{ duration: 1.5, delay: 0.3, ease: "easeOut" }}
                      style={{ transformOrigin: "center", transform: "rotate(-90deg)" }}
                    />
                    <defs>
                      <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#D4AF37" />
                        <stop offset="100%" stopColor="#F4D675" />
                      </linearGradient>
                    </defs>
                  </svg>
                  {/* Center text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-gold font-display">{counter}</span>
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>/ 36 Gunas</span>
                  </div>
                </div>
              </div>

              {/* Match label */}
              <p className="text-center text-green-400 text-sm font-medium mb-5">Excellent Match ✓</p>

              {/* Guna table */}
              <div className="space-y-1">
                {[
                  { aspect: "Varna (temperament)", score: "1/1" },
                  { aspect: "Vashya (dominance)", score: "2/2" },
                  { aspect: "Tara (destiny)", score: "3/3" },
                  { aspect: "Yoni (nature)", score: "4/4" },
                  { aspect: "Graha Maitri (mental)", score: "5/5" },
                  { aspect: "Gana (temperament)", score: "6/6" },
                  { aspect: "Bhakoot (emotional)", score: "7/7" },
                ].map(({ aspect, score }, i) => (
                  <motion.div
                    key={aspect}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.07 }}
                    className="flex justify-between px-4 py-2.5 rounded-xl text-sm"
                    style={{
                      background: i % 2 === 0 ? "rgba(212,175,55,0.03)" : "transparent",
                      borderBottom: "1px solid rgba(212,175,55,0.08)",
                    }}
                  >
                    <span style={{ color: "var(--text-muted)" }}>{aspect}</span>
                    <span className="text-gold font-medium">{score}</span>
                  </motion.div>
                ))}
              </div>

              <p className="mt-5 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {form.boyName} and {form.girlName} share a highly auspicious cosmic bond. Jupiter and Venus favour
                a harmonious and prosperous life together.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.main>
  );
}
