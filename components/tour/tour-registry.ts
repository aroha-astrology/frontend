import type { LucideIcon } from "lucide-react";
import {
  Sparkles, Moon, Star, MessageCircle, CalendarDays, Flower2, FileText, Gauge, ListTree, Scale, Activity,
  Grid3x3, Layers, Clock, Gem, Hand, Home, Mic, Phone, MapPin, Compass, ScrollText, Sun,
} from "lucide-react";

export interface TourStep {
  id: string;
  /**
   * Matches a `data-tour="…"` attribute somewhere on the page. `null` = a
   * centered welcome card with no spotlight.
   *
   * A step whose target isn't in the DOM is SKIPPED, not shown pointing at
   * nothing — home sections are feature-flag filtered (app/page.tsx) and the
   * report view has two entirely different render paths, so a step list is
   * always a superset of what any given user actually sees.
   */
  target: string | null;
  titleKey: string;
  bodyKey: string;
  /** Shown in the tooltip header. Purely decorative. */
  icon?: LucideIcon;
}

export interface TourDef {
  /** Stored in `user.toursCompleted`. Never rename one of these — it re-runs the tour for everyone. */
  id: string;
  /** Pathname this tour belongs to. */
  path: string;
  /** Match `path` exactly instead of as a prefix. Needed for "/" and for "/reports" vs "/reports/[id]". */
  exact?: boolean;
  /** Sibling routes under the same prefix that this tour must NOT claim. */
  exclude?: string[];
  /**
   * Wait for the page to call `useTourReady(id, true)` before opening. Set only
   * where the targets exist in the DOM while something else still covers the
   * screen — the splash + welcome modal on home, ReportGeneratingSheet (up to
   * 200s) on a report.
   */
  readyGate?: boolean;
  steps: TourStep[];
}

/**
 * Order IS precedence — the first entry whose `path` matches wins, so more
 * specific paths must come first ("/reports/[id]" before "/reports").
 */
export const TOURS: TourDef[] = [
  {
    id: "report-detail",
    path: "/reports/",
    // "/reports/history" lives under the same prefix and is not a report view.
    exclude: ["/reports/history"],
    readyGate: true,
    steps: [
      { id: "intro", target: null, titleKey: "tour.report.introTitle", bodyKey: "tour.report.introBody", icon: Sparkles },
      { id: "header", target: "report-header", titleKey: "tour.report.headerTitle", bodyKey: "tour.report.headerBody", icon: FileText },
      { id: "body", target: "report-body", titleKey: "tour.report.bodyTitle", bodyKey: "tour.report.bodyBody", icon: Star },
      { id: "scores", target: "report-scores", titleKey: "tour.report.scoresTitle", bodyKey: "tour.report.scoresBody", icon: Gauge },
      { id: "covers", target: "report-covers", titleKey: "tour.report.coversTitle", bodyKey: "tour.report.coversBody", icon: ListTree },
      { id: "sections", target: "report-sections", titleKey: "tour.report.sectionsTitle", bodyKey: "tour.report.sectionsBody", icon: ListTree },
      { id: "strength", target: "report-strength", titleKey: "tour.report.strengthTitle", bodyKey: "tour.report.strengthBody", icon: Activity },
      { id: "verdict", target: "report-verdict", titleKey: "tour.report.verdictTitle", bodyKey: "tour.report.verdictBody", icon: Scale },
      { id: "followup", target: "ask-ai", titleKey: "tour.report.followUpTitle", bodyKey: "tour.report.followUpBody", icon: MessageCircle },
    ],
  },
  {
    id: "kundli",
    path: "/kundli",
    exact: true,
    steps: [
      { id: "header", target: "kundli-header", titleKey: "tour.kundli.headerTitle", bodyKey: "tour.kundli.headerBody", icon: Star },
      { id: "chart", target: "kundli-chart", titleKey: "tour.kundli.chartTitle", bodyKey: "tour.kundli.chartBody", icon: Grid3x3 },
      { id: "viewmode", target: "kundli-viewmode", titleKey: "tour.kundli.viewModeTitle", bodyKey: "tour.kundli.viewModeBody", icon: Layers },
      { id: "houses", target: "kundli-houses", titleKey: "tour.kundli.housesTitle", bodyKey: "tour.kundli.housesBody", icon: Home },
      { id: "dasha", target: "kundli-dasha", titleKey: "tour.kundli.dashaTitle", bodyKey: "tour.kundli.dashaBody", icon: Clock },
      { id: "yogadosha", target: "kundli-yogadosha", titleKey: "tour.kundli.yogaDoshaTitle", bodyKey: "tour.kundli.yogaDoshaBody", icon: Sparkles },
      { id: "planets", target: "kundli-planets", titleKey: "tour.kundli.planetsTitle", bodyKey: "tour.kundli.planetsBody", icon: Activity },
      { id: "gemstone", target: "kundli-gemstone", titleKey: "tour.kundli.gemstoneTitle", bodyKey: "tour.kundli.gemstoneBody", icon: Gem },
    ],
  },
  {
    id: "reports-list",
    path: "/reports",
    exact: true,
    steps: [
      { id: "tabs", target: "reports-tabs", titleKey: "tour.reportsList.tabsTitle", bodyKey: "tour.reportsList.tabsBody", icon: ListTree },
      { id: "list", target: "reports-list", titleKey: "tour.reportsList.listTitle", bodyKey: "tour.reportsList.listBody", icon: FileText },
      { id: "gemstone", target: "reports-gemstone", titleKey: "tour.reportsList.gemstoneTitle", bodyKey: "tour.reportsList.gemstoneBody", icon: Gem },
    ],
  },
  {
    id: "ai-chat",
    path: "/ai-chat",
    exact: true,
    steps: [
      { id: "intro", target: null, titleKey: "tour.chat.introTitle", bodyKey: "tour.chat.introBody", icon: MessageCircle },
      { id: "messages", target: "chat-messages", titleKey: "tour.chat.messagesTitle", bodyKey: "tour.chat.messagesBody", icon: MessageCircle },
      { id: "input", target: "chat-input", titleKey: "tour.chat.inputTitle", bodyKey: "tour.chat.inputBody", icon: ScrollText },
      { id: "mic", target: "chat-mic", titleKey: "tour.chat.micTitle", bodyKey: "tour.chat.micBody", icon: Mic },
      { id: "voice", target: "chat-voice", titleKey: "tour.chat.voiceTitle", bodyKey: "tour.chat.voiceBody", icon: Phone },
    ],
  },
  {
    id: "horoscope",
    path: "/horoscope",
    exact: true,
    steps: [
      { id: "timescale", target: "horoscope-timescale", titleKey: "tour.horoscopePage.timescaleTitle", bodyKey: "tour.horoscopePage.timescaleBody", icon: CalendarDays },
      { id: "personalized", target: "horoscope-personalized", titleKey: "tour.horoscopePage.personalizedTitle", bodyKey: "tour.horoscopePage.personalizedBody", icon: Sparkles },
      { id: "signs", target: "horoscope-signs", titleKey: "tour.horoscopePage.signsTitle", bodyKey: "tour.horoscopePage.signsBody", icon: Moon },
      { id: "rating", target: "horoscope-rating", titleKey: "tour.horoscopePage.ratingTitle", bodyKey: "tour.horoscopePage.ratingBody", icon: Gauge },
    ],
  },
  {
    id: "panchang",
    path: "/panchang",
    exact: true,
    steps: [
      { id: "region", target: "panchang-region", titleKey: "tour.panchangPage.regionTitle", bodyKey: "tour.panchangPage.regionBody", icon: MapPin },
      { id: "tithi", target: "panchang-tithi", titleKey: "tour.panchangPage.tithiTitle", bodyKey: "tour.panchangPage.tithiBody", icon: Moon },
      { id: "timings", target: "panchang-timings", titleKey: "tour.panchangPage.timingsTitle", bodyKey: "tour.panchangPage.timingsBody", icon: Sun },
      { id: "choghadiya", target: "panchang-choghadiya", titleKey: "tour.panchangPage.choghadiyaTitle", bodyKey: "tour.panchangPage.choghadiyaBody", icon: Clock },
    ],
  },
  {
    id: "remedies",
    path: "/remedies",
    exact: true,
    steps: [
      { id: "debts", target: "remedies-debts", titleKey: "tour.remediesPage.debtsTitle", bodyKey: "tour.remediesPage.debtsBody", icon: Scale },
      { id: "planets", target: "remedies-planets", titleKey: "tour.remediesPage.planetsTitle", bodyKey: "tour.remediesPage.planetsBody", icon: Flower2 },
      { id: "thisyear", target: "remedies-thisyear", titleKey: "tour.remediesPage.thisYearTitle", bodyKey: "tour.remediesPage.thisYearBody", icon: CalendarDays },
    ],
  },
  {
    id: "vastu",
    path: "/vastu",
    exact: true,
    steps: [
      { id: "canvas", target: "vastu-canvas", titleKey: "tour.vastu.canvasTitle", bodyKey: "tour.vastu.canvasBody", icon: Grid3x3 },
      { id: "palette", target: "vastu-palette", titleKey: "tour.vastu.paletteTitle", bodyKey: "tour.vastu.paletteBody", icon: Home },
      { id: "analysis", target: "vastu-analysis", titleKey: "tour.vastu.analysisTitle", bodyKey: "tour.vastu.analysisBody", icon: Compass },
    ],
  },
  {
    id: "palm",
    path: "/palm",
    exact: true,
    steps: [
      { id: "start", target: "palm-start", titleKey: "tour.palm.startTitle", bodyKey: "tour.palm.startBody", icon: Hand },
      { id: "history", target: "palm-history", titleKey: "tour.palm.historyTitle", bodyKey: "tour.palm.historyBody", icon: ScrollText },
    ],
  },
  {
    id: "home",
    path: "/",
    exact: true,
    readyGate: true,
    steps: [
      { id: "welcome", target: null, titleKey: "tour.welcomeTitle", bodyKey: "tour.welcomeBody", icon: Sparkles },
      { id: "horoscope", target: "daily-horoscope", titleKey: "tour.horoscopeTitle", bodyKey: "tour.horoscopeBody", icon: Moon },
      { id: "kundli", target: "kundli-summary", titleKey: "tour.kundliTitle", bodyKey: "tour.kundliBody", icon: Star },
      { id: "askai", target: "ask-ai", titleKey: "tour.askAiTitle", bodyKey: "tour.askAiBody", icon: MessageCircle },
      { id: "horoscope-tab", target: "nav-horoscope", titleKey: "tour.horoscopeTabTitle", bodyKey: "tour.horoscopeTabBody", icon: Moon },
      // `nav-reports` has been anchored in lib/nav-items.ts since the tour shipped
      // but no step ever used it, and tour.remedies* was translated into all 7
      // languages for a step that got dropped. Both are wired up here.
      { id: "reports-tab", target: "nav-reports", titleKey: "tour.reportsTabTitle", bodyKey: "tour.reportsTabBody", icon: FileText },
      { id: "remedies", target: "remedies-card", titleKey: "tour.remediesTitle", bodyKey: "tour.remediesBody", icon: Flower2 },
      { id: "panchang", target: "nav-panchang", titleKey: "tour.panchangTitle", bodyKey: "tour.panchangBody", icon: CalendarDays },
    ],
  },
];

export function findTour(pathname: string): TourDef | undefined {
  return TOURS.find((tour) => {
    if (tour.exclude?.includes(pathname)) return false;
    return tour.exact ? pathname === tour.path : pathname.startsWith(tour.path) && pathname !== tour.path;
  });
}

/**
 * Legacy localStorage key from when there was exactly one tour. Read once at
 * startup to backfill `home` into the server-side list, then deleted — without
 * it every existing user would be shown the home tour a second time.
 */
export const LEGACY_TOUR_DONE_KEY = "aroha_tour_completed";

/** Mirror of `user.toursCompleted`, so a tour doesn't flash before /v1/me resolves. */
export const TOURS_MIRROR_KEY = "aroha:tours:v1";
