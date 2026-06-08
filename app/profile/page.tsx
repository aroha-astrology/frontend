"use client";

import { motion } from "framer-motion";
import { Star, ScrollText, FileText } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import Link from "next/link";

export default function ProfilePage() {
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
        {/* Profile hero */}
        <div className="pt-10 pb-6 px-5 text-center relative">
          {/* Decorative ring + avatar */}
          <div className="relative inline-block mb-4">
            <div
              className="absolute -inset-1 rounded-full"
              style={{
                background: "linear-gradient(135deg, rgba(212,175,55,0.4), transparent)",
                filter: "blur(6px)",
              }}
            />
            <div
              className="relative w-24 h-24 rounded-full flex items-center justify-center text-4xl border-2"
              style={{ borderColor: "var(--gold)", background: "rgba(212,175,55,0.1)" }}
            >
              🧙
            </div>
          </div>

          <h2
            className="font-editorial text-2xl font-semibold"
            style={{ color: "var(--foreground)", fontStyle: "italic" }}
          >
            Cosmic Seeker
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Member since 2025
          </p>

          {/* Plan badge */}
          <div
            className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full border text-xs"
            style={{
              background: "rgba(212,175,55,0.08)",
              borderColor: "rgba(212,175,55,0.3)",
              color: "var(--gold)",
            }}
          >
            ✦ Free Plan
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 px-5 mb-6">
          {[
            { icon: Star, label: "Readings", value: "12" },
            { icon: ScrollText, label: "Kundlis", value: "3" },
            { icon: FileText, label: "Reports", value: "5" },
          ].map(({ icon: Icon, label, value }) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="rounded-2xl p-4 text-center border"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <Icon size={18} className="mx-auto mb-1.5 text-gold" />
              <p className="text-xl font-bold text-gold font-display">{value}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {label}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Saved Kundlis */}
        <div
          className="mx-5 mb-4 p-5 rounded-3xl border"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <h3
            className="font-editorial text-lg font-semibold mb-1"
            style={{ color: "var(--gold)", fontStyle: "italic" }}
          >
            Saved Kundlis
          </h3>
          <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
            No saved Kundlis yet.
          </p>
          <Link
            href="/kundli"
            className="text-sm font-medium"
            style={{ color: "var(--gold)" }}
          >
            Generate Kundli →
          </Link>
        </div>

        {/* Achievements */}
        <div
          className="mx-5 mb-4 p-5 rounded-3xl border"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <h3
            className="font-editorial text-lg font-semibold mb-4"
            style={{ color: "var(--gold)", fontStyle: "italic" }}
          >
            Achievements
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: "🌟", label: "First Reading", unlocked: true },
              { icon: "🔮", label: "AI Chat", unlocked: true },
              { icon: "💎", label: "Premium", unlocked: false },
            ].map(({ icon, label, unlocked }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-center"
                style={{
                  background: unlocked ? "rgba(212,175,55,0.06)" : "rgba(255,255,255,0.02)",
                  borderColor: unlocked ? "rgba(212,175,55,0.25)" : "rgba(255,255,255,0.07)",
                  opacity: unlocked ? 1 : 0.5,
                }}
              >
                <span className="text-2xl">{icon}</span>
                <span
                  className="text-[10px] leading-tight"
                  style={{ color: unlocked ? "var(--gold)" : "var(--text-muted)" }}
                >
                  {label}
                </span>
                {!unlocked && (
                  <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>
                    Locked
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Subscription CTA */}
        <div
          className="mx-5 mt-4 p-5 rounded-3xl text-center"
          style={{
            background: "linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))",
            border: "1px solid rgba(212,175,55,0.25)",
          }}
        >
          <p
            className="font-editorial text-xl"
            style={{ color: "var(--gold)", fontStyle: "italic" }}
          >
            Unlock Full Cosmic Potential
          </p>
          <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
            Premium readings, AI predictions, compatibility reports and more
          </p>
          <button
            className="shimmer-btn mt-4 px-6 py-3 rounded-full font-semibold text-sm"
            style={{ background: "linear-gradient(135deg, #D4AF37, #F4D675)", color: "#05060A" }}
          >
            Go Premium ✨
          </button>
        </div>
      </div>
    </motion.main>
  );
}
