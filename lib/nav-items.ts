import type { LucideIcon } from "lucide-react";
import { Home, Sparkles, Moon, CalendarDays, FileText } from "lucide-react";

export interface NavItem {
  href: string;
  icon: LucideIcon;
  i18nKey: string;
  /** Must match the backend's feature registry exactly — see lib/api.ts's `User.features`. */
  featureKey: string;
  /** The Ask-AI FAB — rendered as a raised center slot, not a normal grid cell. See BottomNavigation.tsx. */
  isCenter?: boolean;
  /** Matches the pre-existing `data-tour` hooks AppTour spotlights — omitted where none existed (home). */
  dataTour?: string;
  /** Home-only quirk preserved from the original markup: its icon fills gold when active, unlike the others. */
  fillIconWhenActive?: boolean;
}

/**
 * Deliberately NOT in components/ — this file carries no literal Tailwind
 * class-name strings, so it doesn't need to live under a Tailwind `content`
 * glob (see tailwind.config.ts: only app/, components/, providers/, data/
 * are scanned). The grid-column-count -> class lookup, which DOES need
 * scanning, stays in BottomNavigation.tsx itself.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", icon: Home, i18nKey: "nav.home", featureKey: "nav.home", fillIconWhenActive: true },
  { href: "/horoscope", icon: Moon, i18nKey: "nav.horoscope", featureKey: "nav.horoscope", dataTour: "nav-horoscope" },
  { href: "/ai-chat", icon: Sparkles, i18nKey: "nav.askAI", featureKey: "nav.askAI", isCenter: true, dataTour: "ask-ai" },
  { href: "/reports", icon: FileText, i18nKey: "nav.reports", featureKey: "nav.reports", dataTour: "nav-reports" },
  { href: "/panchang", icon: CalendarDays, i18nKey: "nav.panchang", featureKey: "nav.panchang", dataTour: "nav-panchang" },
];
