"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  LoveIcon,
  CareerIcon,
  HealthIcon,
  PeaceIcon,
} from "@/components/icons/RemedyIcons";

const categories = [
  {
    icon: LoveIcon,
    label: "Love &\nRelationships",
    href: "/remedies/love",
  },
  {
    icon: CareerIcon,
    label: "Career &\nSuccess",
    href: "/remedies/career",
  },
  {
    icon: HealthIcon,
    label: "Health &\nWellness",
    href: "/remedies/health",
  },
  {
    icon: PeaceIcon,
    label: "Peace &\nPositivity",
    href: "/remedies/peace",
  },
] as const;

export default function RemediesSection() {
  return (
    <section className="px-4 py-2">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-base font-semibold text-white tracking-wide">
          Remedies For You
        </h2>
        <Link
          href="/remedies"
          className="text-xs font-body"
          style={{ color: "var(--gold)" }}
        >
          View All
        </Link>
      </div>

      {/* 2×2 grid */}
      <div className="grid grid-cols-2 gap-3">
        {categories.map(({ icon: Icon, label, href }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.08 }}
          >
            <Link href={href} className="block">
              <div
                className="rounded-2xl border p-4 flex flex-col items-center gap-2 transition-colors active:scale-[0.97]"
                style={{
                  background: "var(--surface)",
                  borderColor: "var(--border)",
                }}
              >
                <Icon size={44} color="var(--gold)" />
                <span
                  className="text-xs text-center leading-snug font-body whitespace-pre-line"
                  style={{ color: "var(--text-muted)" }}
                >
                  {label}
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
