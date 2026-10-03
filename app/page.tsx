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
import AstroWeatherCard from "@/components/weather/AstroWeatherCard";
import BondsCard from "@/components/bonds/BondsCard";
import JournalPromptCard from "@/components/journal/JournalPromptCard";
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
//
// Side padding comes from the page container, not from each section. On a
// phone the sections stack exactly as before; from 768px a run of card
// sections sits side by side (see SectionRun below) and every `md:` class
// here only shapes that wider layout. `md:empty:hidden` drops the wrapper of
// a card that rendered nothing, so it can't leave a hole in the row.

const CARD_SECTION = "mt-6 md:flex-1 md:basis-80 md:min-w-0 md:empty:hidden";
const PROMO_SECTION = "mt-8 mb-6 md:mb-0 md:flex-1 md:basis-80 md:min-w-0";
// The slider runs off the right edge on a phone (-mr-5 cancels the container's
// padding); from 768px it is a grid inside the page width.
const SLIDER_SECTION = "-mr-5 md:mr-0 mt-8";

function TodayReadingSection() {
  return (
    <div className={CARD_SECTION}>
      <TodayReading />
    </div>
  );
}

function AstroWeatherSection() {
  return (
    <div className={CARD_SECTION}>
      <AstroWeatherCard />
    </div>
  );
}

function BondsSection() {
  return (
    <div className={CARD_SECTION}>
      <BondsCard />
    </div>
  );
}

function JournalPromptSection() {
  return (
    <div className={CARD_SECTION}>
      <JournalPromptCard />
    </div>
  );
}

function KundliCardSection() {
  return (
    <div className={CARD_SECTION} data-tour="kundli-summary">
      <KundliCard />
    </div>
  );
}

// The "See All" link follows the same 'home.horoscopeSlider' flag as the
// slider itself — it's part of this section's header, not a separate one.
function HoroscopeSliderSection() {
  const { t } = useTranslation();
  return (
    <div className={SLIDER_SECTION} data-tour="daily-horoscope">
      <div className="flex justify-between items-center pr-5 md:pr-0 mb-4">
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
    <div className={SLIDER_SECTION}>
      <div className="flex justify-between items-center pr-5 md:pr-0 mb-4">
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
    <div className={PROMO_SECTION}>
      <MatchMakingCard />
    </div>
  );
}

function VastuCardSection() {
  return (
    <div className={PROMO_SECTION}>
      <VastuCard />
    </div>
  );
}

function PalmReadingSection() {
  return (
    <div className={PROMO_SECTION}>
      <PalmReadingCard />
    </div>
  );
}

function ShlokasSection() {
  return (
    <div className={PROMO_SECTION}>
      <ShlokasCard />
    </div>
  );
}

function RemediesSection() {
  return (
    <div className={PROMO_SECTION} data-tour="remedies-card">
      <RemediesCard />
    </div>
  );
}

interface HomeSection {
  id: string;
  featureKey: string;
  Component: ComponentType;
  /** A ship-dark roadmap section: a key missing from /v1/me hides it instead of showing it. */
  isNew?: true;
  /** Takes the full page width on its own row (the sliders) instead of joining a row of cards. */
  wide?: true;
}

/** Order here IS render order — preserves the exact pre-existing sequence. */
// Your Day and Next important window now live on the Panchang page (2026-09-25).
const HOME_SECTIONS: HomeSection[] = [
  { id: "todayReading", featureKey: "home.todayReading", Component: TodayReadingSection },
  { id: "astroWeather", featureKey: "home.astroWeather", Component: AstroWeatherSection, isNew: true },
  { id: "bonds", featureKey: "home.bondsCard", Component: BondsSection, isNew: true },
  { id: "journalPrompt", featureKey: "home.journalPrompt", Component: JournalPromptSection, isNew: true },
  { id: "kundliCard", featureKey: "home.kundliCard", Component: KundliCardSection },
  { id: "horoscopeSlider", featureKey: "home.horoscopeSlider", Component: HoroscopeSliderSection, wide: true },
  { id: "reportsSlider", featureKey: "home.reportsSection", Component: ReportsSliderSection, wide: true },
  { id: "matchmaking", featureKey: "home.matchmaking", Component: MatchMakingSection },
  { id: "vastuCard", featureKey: "home.vastuCard", Component: VastuCardSection },
  { id: "palmReading", featureKey: "home.palmReading", Component: PalmReadingSection },
  { id: "shlokas", featureKey: "home.shlokas", Component: ShlokasSection },
  { id: "remedies", featureKey: "home.remedies", Component: RemediesSection },
];

/**
 * Consecutive card sections, grouped so they can share a row on wide screens.
 * On a phone this wrapper is a plain block, so the sections' margins behave
 * exactly as if it weren't there. From 768px it is a wrapping flex row whose
 * cards grow to fill it — a row is never left with an empty slot, however
 * many sections the feature flags leave visible.
 */
function SectionRun({ sections }: { sections: HomeSection[] }) {
  return (
    <div className="md:flex md:flex-wrap md:items-start md:gap-x-6">
      {sections.map(({ id, Component }) => (
        <Component key={id} />
      ))}
    </div>
  );
}

/** Splits the visible sections into runs of cards and stand-alone wide sections, keeping their order. */
function groupSections(sections: HomeSection[]): HomeSection[][] {
  const groups: HomeSection[][] = [];
  for (const section of sections) {
    const last = groups[groups.length - 1];
    if (last && !section.wide && !last[0]!.wide) last.push(section);
    else groups.push([section]);
  }
  return groups;
}

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
  const newKeys = new Set(HOME_SECTIONS.filter((s) => s.isNew).map((s) => s.featureKey));
  const visibleSections = filterByFeature(
    HOME_SECTIONS,
    (key) => resolveFeature(user?.features, key, { failClosed: newKeys.has(key) }).enabled,
  );

  return (
    <main className="cosmic-bg min-h-screen pb-tab-safe relative overflow-hidden text-foreground">
      {/* Backgrounds */}
      <ParticleBackground />
      <MoonBackground planet="mercury" />
      <SplashScreen onDone={() => setSplashDone(true)} />
      <NewUserWelcomeModal onDismiss={() => setWelcomeDone(true)} />

      <div className="relative z-10 page-container">
        {/* Personalized greeting header — identity chrome, always shown */}
        <GreetingHeader />

        {groupSections(visibleSections).map((group) =>
          group[0]!.wide ? (
            group.map(({ id, Component }) => <Component key={id} />)
          ) : (
            <SectionRun key={group[0]!.id} sections={group} />
          ),
        )}
      </div>
    </main>
  );
}
