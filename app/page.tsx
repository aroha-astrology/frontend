"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import GreetingHeader from "@/components/GreetingHeader";
import HoroscopeSlider from "@/components/HoroscopeSlider";
import TodayReading from "@/components/TodayReading";
import KundliCard from "@/components/KundliCard";
import PromoLinkCard from "@/components/PromoLinkCard";
import { Users, Flame, ShoppingBag } from "lucide-react";
import MoonBackground from "@/components/MoonBackground";
import ParticleBackground from "@/components/ParticleBackground";
import SplashScreen from "@/components/SplashScreen";
import AppTour from "@/components/tour/AppTour";
import { TOUR_DONE_KEY } from "@/components/tour/tour-steps";
import { useAuth } from "@/providers/auth-provider";
import { usePermissionsPrompt } from "@/providers/permissions-prompt-provider";

export default function HomePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { resolved: permissionsResolved } = usePermissionsPrompt();
  const [tourOpen, setTourOpen] = useState(false);
  const [splashDone, setSplashDone] = useState(false);

  // Show the tour right after onboarding (?tour=1) or once for any existing
  // user who hasn't seen it yet — but never twice, tracked via localStorage.
  // Gated on the splash finishing first so it doesn't spotlight content that's
  // still hidden behind the loading logo, and on the permissions prompt
  // having resolved first so the two overlays never stack (the tour should
  // appear after the user enables/dismisses permissions, not on top of it).
  useEffect(() => {
    if (!splashDone) return;
    if (!permissionsResolved) return;
    const alreadySeen = localStorage.getItem(TOUR_DONE_KEY) === "1";
    if (alreadySeen) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get("tour") === "1") {
      setTourOpen(true);
    } else if (user?.profileCompletedAt) {
      setTourOpen(true);
    }
  }, [splashDone, permissionsResolved, user]);

  const finishTour = () => {
    setTourOpen(false);
    router.replace("/", { scroll: false });
  };

  return (
    <main className="cosmic-bg min-h-screen pb-tab-safe relative overflow-hidden text-foreground">
      {/* Backgrounds */}
      <ParticleBackground />
      <MoonBackground />
      <SplashScreen onDone={() => setSplashDone(true)} />
      {tourOpen && <AppTour onFinish={finishTour} />}

      <div className="relative z-10">
        {/* Personalized greeting header */}
        <GreetingHeader />

        {/* Today's Reading — personalized horoscope highlights */}
        <div className="px-5 mt-6">
          <TodayReading />
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
          <PromoLinkCard
            icon={
              <>
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 z-10 text-gold">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
                <div className="absolute -top-1 text-gold text-xs">✨</div>
              </>
            }
            title={t("home.matchMaking")}
            description={t("home.matchMakingDesc")}
            href="/compatibility"
          />
        </div>

        {/* Prime expansion — astrologer marketplace, pooja booking, Shagun shop */}
        <div className="px-5 mb-6 flex flex-col gap-3">
          <PromoLinkCard
            icon={<Users className="w-8 h-8 text-gold" />}
            title={t("astrologers.directoryTitle")}
            description={t("astrologers.directorySubtitle")}
            href="/astrologers"
          />
          <PromoLinkCard
            icon={<Flame className="w-8 h-8 text-gold" />}
            title={t("poojaBooking.catalogTitle")}
            description={t("poojaBooking.catalogSubtitle")}
            href="/pooja-booking"
          />
          <PromoLinkCard
            icon={<ShoppingBag className="w-8 h-8 text-gold" />}
            title={t("shagun.catalogTitle")}
            description={t("shagun.catalogSubtitle")}
            href="/shagun"
          />
        </div>
      </div>
    </main>
  );
}
