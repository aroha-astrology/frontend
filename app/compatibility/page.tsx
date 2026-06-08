"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

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

  const inputClass = "w-full h-14 rounded-2xl px-4 outline-none border text-sm focus:border-yellow-500/60 transition-colors";
  const iStyle = { background: "var(--surface)", borderColor: "var(--border)", color: "var(--foreground)" };

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
        <h1 className="text-3xl font-bold text-center text-gold font-display">❤️ Kundli Matching</h1>
        <p className="text-center text-sm mt-2" style={{ color: "var(--text-muted)" }}>
          Find your cosmic compatibility score
        </p>

        <div className="mt-8 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-3">
              <p className="text-xs ml-1" style={{ color: "var(--text-muted)" }}>Boy</p>
              <input placeholder="Name" value={form.boyName} onChange={(e) => setForm({ ...form, boyName: e.target.value })} className={inputClass} style={iStyle} />
              <input type="date" value={form.boyDob} onChange={(e) => setForm({ ...form, boyDob: e.target.value })} className={inputClass} style={iStyle} />
            </div>
            <div className="space-y-3">
              <p className="text-xs ml-1" style={{ color: "var(--text-muted)" }}>Girl</p>
              <input placeholder="Name" value={form.girlName} onChange={(e) => setForm({ ...form, girlName: e.target.value })} className={inputClass} style={iStyle} />
              <input type="date" value={form.girlDob} onChange={(e) => setForm({ ...form, girlDob: e.target.value })} className={inputClass} style={iStyle} />
            </div>
          </div>

          <button
            onClick={() => { if (form.boyName && form.girlName) setResult(true); }}
            disabled={!form.boyName || !form.girlName}
            className="shimmer-btn w-full h-14 rounded-2xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold disabled:opacity-40 transition-opacity"
          >
            Check Compatibility
          </button>
        </div>

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-8 p-6 rounded-3xl border"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gold font-display">
                    {counter} / 36 Gunas
                  </h2>
                  <p className="text-green-400 text-sm font-medium mt-0.5">Excellent Match ✓</p>
                </div>
                <div className="text-4xl">💍</div>
              </div>

              <div className="h-3 rounded-full" style={{ background: "var(--secondary)" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
                  className="h-3 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full"
                />
              </div>

              <div className="mt-5 space-y-3 text-sm" style={{ color: "var(--text-muted)" }}>
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
                    className="flex justify-between"
                  >
                    <span>{aspect}</span>
                    <span className="text-gold font-medium">{score}</span>
                  </motion.div>
                ))}
              </div>

              <p className="mt-4 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {form.boyName} and {form.girlName} share a highly auspicious cosmic bond. Jupiter and Venus favour a harmonious and prosperous life together.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.main>
  );
}
