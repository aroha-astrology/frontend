"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import BrandLogo from "@/components/ui/BrandLogo";
import { useAuth } from "@/providers/auth-provider";
import { resolveFeature } from "@/hooks/useFeature";
import { filterByFeature } from "@/lib/feature-filter";
import { hasAppChrome } from "@/lib/app-chrome";
import { NAV_ITEMS } from "@/lib/nav-items";

/**
 * Desktop navigation: the same five destinations as BottomNavigation, as a
 * fixed left rail from 1024px up (`hidden lg:flex`). Below that the bottom
 * tab bar is the navigation and this renders nothing visible. Both stay in
 * the DOM and are switched in CSS, so there is no flash of the wrong one
 * before hydration; AppTour's target lookup skips whichever is hidden.
 * The page makes room for it in components/AppFrame.tsx.
 */
export default function SideNavigation() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { user } = useAuth();

  if (!hasAppChrome(pathname)) return null;

  // Same filter as BottomNavigation, so an admin switching a tab off removes it from both.
  const items = filterByFeature(NAV_ITEMS, (key) => resolveFeature(user?.features, key).enabled);
  if (items.length === 0) return null;

  return (
    <nav
      data-testid="side-nav"
      className="hidden lg:flex fixed left-0 top-0 bottom-0 z-30 w-side-nav flex-col gap-1 border-r border-gold/15 bg-surface/90 backdrop-blur-xl px-3 pt-[calc(1.5rem+var(--sat))] pb-[calc(1.5rem+var(--sab))]"
    >
      <Link href="/" className="flex items-center gap-3 px-3 pb-6">
        <BrandLogo size={36} />
        <span className="font-display-decorative text-gold text-sm tracking-[0.2em] select-none">AROHA</span>
      </Link>

      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            data-tour={item.dataTour}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm font-medium transition-colors",
              active
                ? "border-gold/30 bg-gold/10 text-gold"
                : item.isCenter
                  ? "border-gold/20 text-gold hover:bg-gold/10"
                  : "border-transparent text-muted hover:bg-gold/5 hover:text-foreground",
            )}
          >
            <Icon size={20} className={active && item.fillIconWhenActive ? "fill-gold" : ""} />
            <span>{t(item.i18nKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
