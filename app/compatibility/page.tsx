"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface CompatForm {
  boyName: string;
  girlName: string;
  boyDob: string;
  girlDob: string;
}

export default function CompatibilityPage() {
  const [form, setForm] = useState<CompatForm>({ boyName: "", girlName: "", boyDob: "", girlDob: "" });
  const [result, setResult] = useState(false);

  const check = () => {
    if (!form.boyName || !form.girlName) return;
    setResult(true);
  };

  const gunas = 28;
  const pct = Math.round((gunas / 36) * 100);

  const inputClass =
    "w-full h-14 rounded-2xl px-4 outline-none border text-sm focus:border-yellow-500/60 transition-colors";
  const style = { background: "var(--surface)", borderColor: "var(--border)", color: "var(--foreground)" };

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
            <div className="space-y-3">
              <p className="text-xs text-[var(--text-muted)] ml-1">Boy</p>
              <input placeholder="Name" value={form.boyName} onChange={(e) => setForm({ ...form, boyName: e.target.value })} className={inputClass} style={style} />
              <input type="date" value={form.boyDob} onChange={(e) => setForm({ ...form, boyDob: e.target.value })} className={inputClass} style={style} />
            </div>
            <div className="space-y-3">
              <p className="text-xs text-[var(--text-muted)] ml-1">Girl</p>
              <input placeholder="Name" value={form.girlName} onChange={(e) => setForm({ ...form, girlName: e.target.value })} className={inputClass} style={style} />
              <input type="date" value={form.girlDob} onChange={(e) => setForm({ ...form, girlDob: e.target.value })} className={inputClass} style={style} />
            </div>
          </div>

          <button
            onClick={check}
            disabled={!form.boyName || !form.girlName}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold disabled:opacity-40 transition-opacity"
          >
            Check Compatibility
          </button>
        </div>

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 p-6 rounded-3xl border"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gold font-display">{gunas} / 36 Gunas</h2>
                <p className="text-green-400 text-sm font-medium mt-0.5">Excellent Match ✓</p>
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

            <div className="mt-5 space-y-3 text-sm" style={{ color: "var(--text-muted)" }}>
              {[
                { aspect: "Varna (temperament)", score: "1/1" },
                { aspect: "Vashya (dominance)", score: "2/2" },
                { aspect: "Tara (destiny)", score: "3/3" },
                { aspect: "Yoni (nature)", score: "4/4" },
                { aspect: "Graha Maitri (mental)", score: "5/5" },
                { aspect: "Gana (temperament)", score: "6/6" },
                { aspect: "Bhakoot (emotional)", score: "7/7" },
              ].map(({ aspect, score }) => (
                <div key={aspect} className="flex justify-between">
                  <span>{aspect}</span>
                  <span className="text-gold font-medium">{score}</span>
                </div>
              ))}
            </div>

            <p className="mt-4 text-sm text-[var(--text-muted)] leading-relaxed">
              {form.boyName} and {form.girlName} share a highly auspicious cosmic bond. Jupiter and Venus favour a harmonious and prosperous life together.
            </p>
          </motion.div>
        )}
      </div>
    </main>
  );
}
