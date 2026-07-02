"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import Hero from "@/components/Hero";
import HoroscopeSlider from "@/components/HoroscopeSlider";
import AIChatPreview from "@/components/AIChatPreview";
import SectionTitle from "@/components/SectionTitle";
import RemediesSection from "@/components/RemediesSection";
import MatchMakingCard from "@/components/MatchMakingCard";
import MoonBackground from "@/components/MoonBackground";
import ParticleBackground from "@/components/ParticleBackground";
import SplashScreen from "@/components/SplashScreen";
import ThemeSwitch from "@/components/ThemeSwitch";
import LanguagePicker from "@/components/LanguagePicker";
import KundliSummary from "@/components/KundliSummary";
import SidebarMenu from "@/components/SidebarMenu";
import IconButton from "@/components/ui/IconButton";
import { Menu, Bell } from "lucide-react";

export default function HomePage() {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className="cosmic-bg min-h-screen pb-28 relative overflow-hidden text-foreground">
      {/* Backgrounds */}
      <ParticleBackground />
      <MoonBackground />
      <SplashScreen />
      <SidebarMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="relative z-10">
        {/* Top bar */}
        <div className="flex justify-between items-center px-5 pt-8 pb-4">
          <IconButton aria-label="Menu" onClick={() => setMenuOpen(true)}>
            <Menu size={20} />
          </IconButton>
          <div className="flex items-center gap-2">
            <LanguagePicker />
            <ThemeSwitch />
            <IconButton aria-label="Notifications">
              <Bell size={20} />
            </IconButton>
          </div>
        </div>

        {/* Hero Section */}
        <Hero />

        {/* AI Astrologer Card */}
        <div className="px-5 mt-6">
          <AIChatPreview />
        </div>

        {/* Kundli Summary */}
        <div className="px-5 mt-6">
          <KundliSummary />
        </div>

        {/* Daily Horoscopes — Moon-sign (rashi-only), distinct from the personalized kundli horoscope */}
        <div className="pl-5 pr-0 mt-8">
          <div className="flex justify-between items-center pr-5 mb-4">
            <h2 className="text-lg font-display text-foreground">{t("home.moonSignHoroscope")}</h2>
            <Link href="/horoscope" className="text-gold text-sm flex items-center gap-1">
              {t("common.seeAll")} <span className="text-[10px]">▶</span>
            </Link>
          </div>
          <HoroscopeSlider />
        </div>

        {/* Match Making */}
        <div className="px-5 mt-8">
          <MatchMakingCard />
        </div>

        {/* Remedies For You */}
        <div className="px-5 mt-8 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-display text-foreground">{t("home.remediesForYou")}</h2>
            <button className="text-gold text-sm">{t("common.viewAll")}</button>
          </div>
          <RemediesSection />
        </div>
      </div>
    </main>
  );
}
