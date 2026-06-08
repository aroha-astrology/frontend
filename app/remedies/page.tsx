"use client";

import { useState } from "react";
import { remedies } from "@/data/remedies";
import { motion } from "framer-motion";
import AppHeader from "@/components/AppHeader";

const categories = ["All", "Career", "Love", "Health", "Finance", "Peace", "Family"];

const categoryKeywords: Record<string, string[]> = {
  Career: ["career"],
  Love: ["marriage", "love"],
  Health: ["health", "vitality"],
  Finance: ["financial", "abundance", "wealth"],
  Peace: ["peace", "mental"],
  Family: ["family", "harmony"],
};

function getRemedyTags(remedy: string): string[] {
  const lower = remedy.toLowerCase();
  const tags: string[] = [];
  if (/chant|recite|mantra/.test(lower)) tags.push("Mantra");
  else if (/offer|donate|light/.test(lower)) tags.push("Offering");
  else tags.push("Ritual");
  return tags;
}

export default function RemediesPage() {
  const [activeCategory, setActiveCategory] = useState("All");

  const filteredRemedies =
    activeCategory === "All"
      ? remedies
      : remedies.filter((item) => {
          const keywords = categoryKeywords[activeCategory] ?? [];
          const combined = `${item.title} ${item.remedy}`.toLowerCase();
          return keywords.some((kw) => combined.includes(kw));
        });

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
        <div className="text-center pt-10 px-5 mb-4">
          <span className="text-[10px] font-display tracking-[0.35em] text-[var(--text-muted)] uppercase">
            ✦ Vedic Remedies ✦
          </span>
          <h1
            className="font-editorial text-4xl font-semibold mt-1"
            style={{ color: "var(--gold)", fontStyle: "italic" }}
          >
            Daily Remedies
          </h1>
          <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
            Harmonise your planetary energies
          </p>
        </div>

        {/* Category filter chips */}
        <div className="flex gap-2 px-5 mb-5 overflow-x-auto scrollbar-hide pb-1">
          {categories.map((cat) => {
            const isActive = cat === activeCategory;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-display tracking-wide border transition-all"
                style={
                  isActive
                    ? {
                        background: "linear-gradient(135deg, #D4AF37, #F4D675)",
                        borderColor: "transparent",
                        color: "#05060A",
                        fontWeight: 600,
                      }
                    : {
                        background: "transparent",
                        borderColor: "rgba(212,175,55,0.25)",
                        color: "var(--text-muted)",
                      }
                }
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Remedy cards */}
        <div className="px-5 space-y-4">
          {filteredRemedies.map((item, i) => {
            const tags = getRemedyTags(item.remedy);
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="p-5 rounded-3xl border"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              >
                {/* Header row */}
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{item.icon}</span>
                  <h3
                    className="font-editorial text-lg font-semibold"
                    style={{ color: "var(--gold)", fontStyle: "italic" }}
                  >
                    {item.title}
                  </h3>
                </div>

                {/* Body */}
                <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--text-muted)" }}>
                  {item.remedy}
                </p>

                {/* Footer tags */}
                <div className="flex gap-1.5 flex-wrap">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-2 py-0.5 rounded-full border"
                      style={{
                        borderColor: "rgba(212,175,55,0.35)",
                        color: "var(--gold)",
                        background: "rgba(212,175,55,0.06)",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.main>
  );
}
