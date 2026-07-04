"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import Hero from "@/components/Hero";
import HoroscopeSlider from "@/components/HoroscopeSlider";
import AIChatPreview from "@/components/AIChatPreview";
import KundliCard from "@/components/KundliCard";
import MatchMakingCard from "@/components/MatchMakingCard";
import MoonBackground from "@/components/MoonBackground";
import ParticleBackground from "@/components/ParticleBackground";
import SplashScreen from "@/components/SplashScreen";
import ThemeSwitch from "@/components/ThemeSwitch";
import LanguagePicker from "@/components/LanguagePicker";
import NotificationsSheet from "@/components/NotificationsSheet";
import AppTour from "@/components/tour/AppTour";
import { TOUR_DONE_KEY } from "@/components/tour/tour-steps";
import { useAuth } from "@/providers/auth-provider";
import IconButton from "@/components/ui/IconButton";
import AppMenuDrawer from "@/components/AppMenuDrawer";
import { Menu, Bell } from "lucide-react";

export default function HomePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [splashDone, setSplashDone] = useState(false);

  // Show the tour right after onboarding (?tour=1) or once for any existing
  // user who hasn't seen it yet — but never twice, tracked via localStorage.
  // Gated on the splash finishing first so it doesn't spotlight content that's
  // still hidden behind the loading logo.
  useEffect(() => {
    if (!splashDone) return;
    const alreadySeen = localStorage.getItem(TOUR_DONE_KEY) === "1";
    if (alreadySeen) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get("tour") === "1") {
      setTourOpen(true);
    } else if (user?.profileCompletedAt) {
      setTourOpen(true);
    }
  }, [splashDone, user]);

  const finishTour = () => {
    setTourOpen(false);
    router.replace("/", { scroll: false });
  };

  return (
    <main className="cosmic-bg min-h-screen pb-28 relative overflow-hidden text-foreground">
      {/* Backgrounds */}
      <ParticleBackground />
      <MoonBackground />
      <SplashScreen onDone={() => setSplashDone(true)} />
      <NotificationsSheet open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
      {tourOpen && <AppTour onFinish={finishTour} />}

      <div className="relative z-10">
        {/* Top bar */}
        <div className="flex justify-between items-center px-5 pt-8 pb-4">
          <IconButton aria-label={t("menu.title")} onClick={() => setMenuOpen(true)}>
            <Menu size={20} />
          </IconButton>
          <div className="flex items-center gap-2">
            <LanguagePicker />
            <ThemeSwitch />
            <IconButton aria-label="Notifications" onClick={() => setNotificationsOpen(true)}>
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

        {/* Natal Kundli — fetched after onboarding, polls /v1/kundli (202 → retry every 2s) */}
        <div className="px-5 mt-6" data-tour="kundli-summary">
          <KundliCard />
        </div>

        {/* Daily Horoscopes — Moon-sign (rashi-only), distinct from the personalized kundli horoscope */}
        <div className="pl-5 pr-0 mt-8" data-tour="daily-horoscope">
          <div className="flex justify-between items-center pr-5 mb-4">
            <h2 className="text-lg font-display text-foreground">{t("home.moonSignHoroscope")}</h2>
            <Link href="/horoscope" className="text-gold text-sm flex items-center gap-1">
              {t("common.seeAll")} <span className="text-[10px]">▶</span>
            </Link>
          </div>
          <HoroscopeSlider />
        </div>

        {/* Match Making */}
        <div className="px-5 mt-8 mb-6">
          <MatchMakingCard />
        </div>
      </div>

      {/* Slide-in menu (profile / settings / sign out) */}
      <AppMenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </main>
  );
}
