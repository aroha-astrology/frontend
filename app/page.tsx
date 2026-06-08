"use client";

import { motion } from "framer-motion";
import Hero from "@/components/Hero";
import AIChatPreview from "@/components/AIChatPreview";
import KundliCard from "@/components/KundliCard";
import HoroscopeSlider from "@/components/HoroscopeSlider";
import MatchCard from "@/components/MatchCard";
import ParticleBackground from "@/components/ParticleBackground";
import SplashScreen from "@/components/SplashScreen";
import AppHeader from "@/components/AppHeader";
import Link from "next/link";

export default function HomePage() {
  return (
    <motion.main
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen pb-28 relative"
      style={{ background: "var(--background)" }}
    >
      <ParticleBackground />
      <SplashScreen />
      <AppHeader />

      {/* Hero (moon + zodiac wheel + shimmer title + CTA) */}
      <div className="pt-14">
        <Hero />
      </div>

      {/* AI Astrologer card */}
      <div className="mt-5">
        <AIChatPreview />
      </div>

      {/* Kundli Generator card */}
      <div className="mt-3">
        <KundliCard />
      </div>

      {/* Today's Horoscope */}
      <div className="mt-6">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
            Today&apos;s Horoscope
          </h2>
          <Link href="/horoscope" className="text-xs text-gold">
            View all
          </Link>
        </div>
        <HoroscopeSlider />
      </div>

      {/* Match Making card */}
      <div className="mt-4 mb-4">
        <MatchCard />
      </div>
    </motion.main>
  );
}
