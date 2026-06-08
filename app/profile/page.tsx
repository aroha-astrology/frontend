"use client";

import { motion } from "framer-motion";
import { User, Star, Settings } from "lucide-react";

export default function ProfilePage() {
  return (
    <motion.main
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen pb-28 pt-10"
      style={{ background: "var(--background)" }}
    >
      <div className="px-5">
        <h1 className="text-3xl font-bold text-center text-gold font-display mb-8">
          👤 Profile
        </h1>

        {/* Avatar */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center border-2 text-4xl"
            style={{ borderColor: "var(--gold)", background: "rgba(212,175,55,0.1)" }}
          >
            🧙
          </div>
          <p className="mt-3 font-semibold text-lg" style={{ color: "var(--foreground)" }}>
            Cosmic Seeker
          </p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Member since 2025
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: Star, label: "Readings", value: "12" },
            { icon: User, label: "Kundlis", value: "3" },
            { icon: Settings, label: "Reports", value: "5" },
          ].map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="rounded-2xl p-4 text-center border"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <Icon size={20} className="mx-auto mb-1 text-gold" />
              <p className="text-lg font-bold text-gold">{value}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Coming soon */}
        <div
          className="rounded-3xl p-6 text-center border"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <p className="text-2xl mb-3">🚀</p>
          <p className="font-semibold text-gold">Full Profile Coming Soon</p>
          <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
            Save your birth chart, track predictions, and access your full cosmic history.
          </p>
        </div>
      </div>
    </motion.main>
  );
}
