"use client";

import { motion } from "framer-motion";
import Hero from "@/components/Hero";
import AIChatPreview from "@/components/AIChatPreview";
import HoroscopeSlider from "@/components/HoroscopeSlider";
import MatchCard from "@/components/MatchCard";
import CosmicWheel from "@/components/CosmicWheel";
import RemediesSection from "@/components/RemediesSection";
import SplashScreen from "@/components/SplashScreen";
import AppHeader from "@/components/AppHeader";
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

      {/* Hero */}
      <div className="pt-14">
        <Hero />
      </div>

      {/* AI Astrologer card */}
      <div className="mt-8">
        <AIChatPreview />
      </div>

      {/* Daily Horoscope */}
      <div className="mt-12">
        <div className="flex items-center justify-between px-5 mb-5">
          <div>
            <p
              className="font-display uppercase mb-1"
              style={{ fontSize: "0.6rem", letterSpacing: "0.5em", color: "rgba(212,175,55,0.5)" }}
            >
              Today&apos;s Reading
            </p>
            <h2
              className="font-display font-semibold text-white tracking-wide"
              style={{ fontSize: "1rem" }}
            >
              Daily Horoscope
            </h2>
          </div>
          <Link
            href="/horoscope"
            className="text-xs"
            style={{ color: "rgba(212,175,55,0.7)" }}
          >
            See All →
          </Link>
        </div>
        <HoroscopeSlider />
      </div>

      {/* Cosmic Wheel */}
      <div className="mt-8">
        <CosmicWheel />
      </div>

      {/* Match Making card */}
      <div className="mt-10">
        <MatchCard />
      </div>

      {/* Remedies Section */}
      <div className="mt-10">
        <RemediesSection />
      </div>

      {/* Testimonials */}
      <TestimonialsCarousel />

      {/* CTA */}
      <CTASection />
    </motion.main>
  );
}
