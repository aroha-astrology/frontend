"use client";

import { remedies } from "@/data/remedies";
import { motion } from "framer-motion";

export default function RemediesPage() {
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
        <h1 className="text-3xl font-bold text-center text-gold font-display mb-2">
          🪔 Daily Remedies
        </h1>
        <p className="text-center text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          Vedic remedies to harmonise your planetary energies
        </p>

        <div className="space-y-4">
          {remedies.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="p-5 rounded-3xl border"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{item.icon}</span>
                <h3 className="text-base font-semibold text-gold">{item.title}</h3>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {item.remedy}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.main>
  );
}
