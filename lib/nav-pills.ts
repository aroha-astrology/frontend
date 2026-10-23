/**
 * Sub-tab pills (switch nav.pills): under each of the five tabs a short row of related pages, so the
 * drawer does not have to carry them all. Each pill is a page that already exists; a pill whose own
 * switch is off is left out, and a row with fewer than two pills is not shown at all.
 */

export interface NavPill {
  href: string;
  /** An existing label string, so every language and the Cosmic wording come for free. */
  labelKey: string;
  /** The page's own switch; left out of the row when it is off. */
  featureKey?: string;
  /** A switch added with the roadmap: a missing key counts as OFF rather than ON. */
  isNew?: boolean;
}

export interface PillGroup {
  id: "today" | "forecast" | "ask" | "reports" | "almanac";
  pills: NavPill[];
}

export const PILL_GROUPS: readonly PillGroup[] = [
  {
    id: "today",
    pills: [
      { href: "/", labelKey: "nav.home" },
      { href: "/kundli", labelKey: "nav.kundli" },
      { href: "/journal", labelKey: "journal.menu", featureKey: "nav.journal", isNew: true },
    ],
  },
  {
    id: "forecast",
    pills: [
      { href: "/horoscope", labelKey: "nav.horoscope" },
      { href: "/calendar", labelKey: "calendar.menu", featureKey: "nav.calendar", isNew: true },
      { href: "/timeline", labelKey: "timeline.menu", featureKey: "nav.lifeTimeline", isNew: true },
    ],
  },
  {
    id: "ask",
    pills: [
      { href: "/ai-chat", labelKey: "nav.askAI" },
      { href: "/chat-history", labelKey: "menu.chatHistory" },
      { href: "/decide", labelKey: "decide.menu", featureKey: "nav.decisions", isNew: true },
    ],
  },
  {
    id: "reports",
    pills: [
      { href: "/reports", labelKey: "nav.reports" },
      { href: "/compatibility", labelKey: "compatibilityPage.title" },
      { href: "/reports/history", labelKey: "menu.myReports" },
    ],
  },
  {
    id: "almanac",
    pills: [
      { href: "/panchang", labelKey: "nav.panchang" },
      { href: "/find-date", labelKey: "findDate.menu", featureKey: "panchang.findMyDate", isNew: true },
      { href: "/practice", labelKey: "practice.menu", featureKey: "nav.dailyPractice", isNew: true },
    ],
  },
];

/** The row this page belongs to, or null. A page belongs to a row only when it IS one of its pills. */
export function pillGroupFor(pathname: string): PillGroup | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return PILL_GROUPS.find((g) => g.pills.some((p) => p.href === path)) ?? null;
}

/** The pills to draw, given a lookup for each page's switch. Fewer than two means no row. */
export function visiblePills(group: PillGroup, isOn: (pill: NavPill) => boolean): NavPill[] {
  const pills = group.pills.filter((p) => !p.featureKey || isOn(p));
  return pills.length >= 2 ? pills : [];
}

export function isPillActive(pill: NavPill, pathname: string): boolean {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return pill.href === path;
}
