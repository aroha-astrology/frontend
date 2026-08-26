"use client";

import { useState, type ComponentType } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import GreetingHeader from "@/components/GreetingHeader";
import HoroscopeSlider from "@/components/HoroscopeSlider";
import ReportsSlider from "@/components/ReportsSlider";
import TodayReading from "@/components/TodayReading";
import KundliCard from "@/components/KundliCard";
import MatchMakingCard from "@/components/MatchMakingCard";
import VastuCard from "@/components/VastuCard";
import PalmReadingCard from "@/components/PalmReadingCard";
import ShlokasCard from "@/components/ShlokasCard";
import RemediesCard from "@/components/RemediesCard";
import MoonBackground from "@/components/MoonBackground";
import ParticleBackground from "@/components/ParticleBackground";
import SplashScreen from "@/components/SplashScreen";
import NewUserWelcomeModal from "@/components/NewUserWelcomeModal";
import { useAuth } from "@/providers/auth-provider";
import { useTourReady } from "@/providers/tour-provider";
import { resolveFeature } from "@/hooks/useFeature";
import { filterByFeature } from "@/lib/feature-filter";

// ─── Home sections ──────────────────────────────────────────────────────────
// Each section component wraps its own exact original markup (spacing,
// data-tour hooks, etc.) unchanged — extracting this into a data-driven,
// filterable array only controls WHETHER a section renders, never how.
// GreetingHeader is deliberately NOT one of these: it's identity chrome
// (who's signed in), not a togglable feature, so it always renders first.

function TodayReadingSection() {
  return (
    <div className="px-5 mt-6">
      <TodayReading />
    </div>
  );
}

function KundliCardSection() {
  return (
    <div className="px-5 mt-6" data-tour="kundli-summary">
      <KundliCard />
    </div>
  );
}

// The "See All" link follows the same 'home.horoscopeSlider' flag as the
// slider itself — it's part of this section's header, not a separate one.
function HoroscopeSliderSection() {
  const { t } = useTranslation();
  return (
    <div className="pl-5 pr-0 mt-8" data-tour="daily-horoscope">
      <div className="flex justify-between items-center pr-5 mb-4">
        <h2 className="text-lg font-display text-foreground">{t("home.moonSignHoroscope")}</h2>
        <Link href="/horoscope" className="text-gold text-sm flex items-center gap-1">
          {t("common.seeAll")} <span className="text-[10px]">▶</span>
        </Link>
      </div>
      <HoroscopeSlider />
    </div>
  );
}

// The "See All" link follows the same 'home.reportsSection' flag as the
// slider itself — it's part of this section's header, not a separate one
// (mirrors HoroscopeSliderSection above).
function ReportsSliderSection() {
  const { t } = useTranslation();
  return (
    <div className="pl-5 pr-0 mt-8">
      <div className="flex justify-between items-center pr-5 mb-4">
        <h2 className="text-lg font-display text-foreground">{t("reports.title")}</h2>
        <Link href="/reports" className="text-gold text-sm flex items-center gap-1">
          {t("common.seeAll")} <span className="text-[10px]">▶</span>
        </Link>
      </div>
      <ReportsSlider />
    </div>
  );
}

function MatchMakingSection() {
  return (
    <div className="px-5 mt-8 mb-6">
      <MatchMakingCard />
    </div>
  );
}

function VastuCardSection() {
  return (
    <div className="px-5 mt-8 mb-6">
      <VastuCard />
    </div>
  );
}

function PalmReadingSection() {
  return (
    <div className="px-5 mt-8 mb-6">
      <PalmReadingCard />
    </div>
  );
}

function ShlokasSection() {
  return (
    <div className="px-5 mt-8 mb-6">
      <ShlokasCard />
    </div>
  );
}

function RemediesSection() {
  return (
    <div className="px-5 mt-8 mb-6" data-tour="remedies-card">
      <RemediesCard />
    </div>
  );
}

interface HomeSection {
  id: string;
  featureKey: string;
  Component: ComponentType;
}

/** Order here IS render order — preserves the exact pre-existing sequence. */
const HOME_SECTIONS: HomeSection[] = [
  { id: "todayReading", featureKey: "home.todayReading", Component: TodayReadingSection },
  { id: "kundliCard", featureKey: "home.kundliCard", Component: KundliCardSection },
  { id: "horoscopeSlider", featureKey: "home.horoscopeSlider", Component: HoroscopeSliderSection },
  { id: "reportsSlider", featureKey: "home.reportsSection", Component: ReportsSliderSection },
  { id: "matchmaking", featureKey: "home.matchmaking", Component: MatchMakingSection },
  { id: "vastuCard", featureKey: "home.vastuCard", Component: VastuCardSection },
  { id: "palmReading", featureKey: "home.palmReading", Component: PalmReadingSection },
  { id: "shlokas", featureKey: "home.shlokas", Component: ShlokasSection },
  { id: "remedies", featureKey: "home.remedies", Component: RemediesSection },
];

export default function HomePage() {
  const { user } = useAuth();
  const [splashDone, setSplashDone] = useState(false);
  const [welcomeDone, setWelcomeDone] = useState(false);

  // The home tour's targets are in the DOM from first paint but sit behind the
  // splash logo and then the welcome modal, so the tour can't just key off the
  // route. TourHost owns the rest of the decision (already seen? permissions
  // resolved? ?tour=1?) — this only reports that the screen is actually visible.
  useTourReady("home", splashDone && welcomeDone);

  // The old finishTour() cleared today's `aroha:dailyReward:<date>` key to force
  // the reward modal open the instant the tour closed. Unnecessary now: the
  // modal gates on `tourActive`, so it surfaces on its own once the tour ends.

  // Resolved once per render (not one useFeature() call per section, which
  // would call a hook from inside a filter callback) — see
  // lib/feature-filter.ts's doc comment for why.
  const visibleSections = filterByFeature(HOME_SECTIONS, (key) => resolveFeature(user?.features, key).enabled);

  return (
    <main className="cosmic-bg min-h-screen pb-tab-safe relative overflow-hidden text-foreground">
      {/* Backgrounds */}
      <ParticleBackground />
      <MoonBackground planet="mercury" />
      <SplashScreen onDone={() => setSplashDone(true)} />
      <NewUserWelcomeModal onDismiss={() => setWelcomeDone(true)} />

      <div className="relative z-10">
        {/* Personalized greeting header — identity chrome, always shown */}
        <GreetingHeader />

        {visibleSections.map(({ id, Component }) => (
          <Component key={id} />
        ))}
      </div>
    </main>
  );
}
