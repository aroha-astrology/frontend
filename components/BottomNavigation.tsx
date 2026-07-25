"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/providers/auth-provider";
import { resolveFeature } from "@/hooks/useFeature";
import { filterByFeature } from "@/lib/feature-filter";
import { NAV_ITEMS, type NavItem } from "@/lib/nav-items";

/**
 * Explicit column-count -> class lookup — `` `grid-cols-${n}` `` is invisible
 * to Tailwind's JIT content scanner (it only finds literal class-name
 * strings in scanned files, not runtime-interpolated ones), so the class
 * would never be generated into the CSS bundle without this. Lives here
 * (components/**) rather than in lib/nav-items.ts because only paths under
 * tailwind.config.ts's `content` globs are scanned.
 */
const GRID_COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
};

function NavCell({ item, active }: { item: NavItem; active: boolean }) {
  const { t } = useTranslation();
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      data-tour={item.dataTour}
      className={clsx(
        "flex flex-col items-center justify-center gap-1 transition-colors",
        active ? "text-gold" : "text-muted",
      )}
    >
      <Icon size={22} className={active && item.fillIconWhenActive ? "fill-gold" : ""} />
      <span className="text-[10px] font-medium whitespace-nowrap">{t(item.i18nKey)}</span>
    </Link>
  );
}

/** The Ask-AI FAB keeps its exact special-cased markup — raised center slot, glow, absolute-positioned label — never flattened into NavCell's plain-Link shape. */
function CenterFab({ item }: { item: NavItem }) {
  const { t } = useTranslation();
  return (
    <div className="flex justify-center -mt-8" data-tour={item.dataTour}>
      <Link href={item.href} className="relative">
        <div className="absolute inset-0 bg-gold/20 rounded-full blur-xl scale-150" />
        <div className="relative w-16 h-16 rounded-full border border-gold/50 bg-fab flex items-center justify-center text-gold shadow-[0_0_20px_rgba(223,181,100,0.3)]">
          <Sparkles size={24} />
        </div>
        <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-medium text-gold whitespace-nowrap">
          {t(item.i18nKey)}
        </span>
      </Link>
    </div>
  );
}

export default function BottomNavigation() {
  const pathname = usePathname();
  const { user } = useAuth();

  const hidden = ["/onboarding", "/sign-in", "/sign-up", "/legal"].some((p) => pathname.startsWith(p));
  if (hidden) return null;

  // Resolved once per render (not one useFeature() call per item, which
  // would call a hook from inside a filter callback) — see
  // lib/feature-filter.ts's doc comment for why.
  const items = filterByFeature(NAV_ITEMS, (key) => resolveFeature(user?.features, key).enabled);

  // Pathological admin misconfiguration (every nav item disabled) — render
  // nothing rather than an empty bar with zero grid columns. Distinct from
  // the route-based `hidden` case above.
  if (items.length === 0) return null;

  const gridColsClass = GRID_COLS[items.length] ?? GRID_COLS[5];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-gold/20 bg-surface/95 backdrop-blur-xl h-tab-bar pb-sab rounded-t-[2.5rem] transform-gpu"
      style={{ WebkitBackfaceVisibility: "hidden", backfaceVisibility: "hidden" }}
    >
      {/* h-full resolves against the nav's content box, which excludes pb-sab —
          so the row self-limits to the bar and never enters the inset. */}
      <div className={clsx("relative grid h-full max-w-lg mx-auto items-center", gridColsClass)}>
        {items.map((item) =>
          item.isCenter ? (
            <CenterFab key={item.href} item={item} />
          ) : (
            <NavCell key={item.href} item={item} active={pathname === item.href} />
          ),
        )}
      </div>
    </nav>
  );
}
