"use client";

import { motion } from "framer-motion";
import Hero from "@/components/Hero";
import AIChatPreview from "@/components/AIChatPreview";
import KundliCard from "@/components/KundliCard";
import HoroscopeSlider from "@/components/HoroscopeSlider";
import MatchCard from "@/components/MatchCard";
import CosmicWheel from "@/components/CosmicWheel";
import RemediesSection from "@/components/RemediesSection";
import SplashScreen from "@/components/SplashScreen";
import AppHeader from "@/components/AppHeader";
import WhyChooseSection from "@/components/WhyChooseSection";
import TestimonialsCarousel from "@/components/TestimonialsCarousel";
import CTASection from "@/components/CTASection";
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

      {/* Daily Horoscope */}
      <div className="mt-6">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="font-display text-base font-semibold tracking-wide" style={{ color: "var(--foreground)" }}>
            Daily Horoscope
          </h2>
          <Link href="/horoscope" className="text-xs text-gold">
            See All →
          </Link>
        </div>
        <HoroscopeSlider />
      </div>

      {/* Cosmic Wheel */}
      <div className="mt-2">
        <CosmicWheel />
      </div>

      {/* Match Making card */}
      <div className="mt-4">
        <MatchCard />
      </div>

      {/* Remedies Section */}
      <div className="mt-2">
        <RemediesSection />
      </div>

      {/* Section 4 — Why Choose Aroho */}
      <WhyChooseSection />

      {/* Section 5 — Testimonials */}
      <TestimonialsCarousel />

      {/* Section 6 — CTA */}
      <CTASection />
    </motion.main>
  );
}
