"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Sparkles, Moon, CalendarDays } from "lucide-react";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";

export default function BottomNavigation() {
  const pathname = usePathname();
  const { t } = useTranslation();

  const hidden = ["/onboarding", "/sign-in", "/sign-up", "/legal"].some((p) => pathname.startsWith(p));
  if (hidden) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-gold/20 bg-surface/95 backdrop-blur-xl h-tab-bar pb-sab rounded-t-[2.5rem] transform-gpu"
      style={{ WebkitBackfaceVisibility: "hidden", backfaceVisibility: "hidden" }}
    >
      {/* h-full resolves against the nav's content box, which excludes pb-sab —
          so the row self-limits to the bar and never enters the inset. */}
      <div className="relative grid grid-cols-5 h-full max-w-lg mx-auto items-center">
        
        <Link href="/" className={clsx("flex flex-col items-center justify-center gap-1 transition-colors", pathname === "/" ? "text-gold" : "text-muted")}>
          <Home size={22} className={pathname === "/" ? "fill-gold" : ""} />
          <span className="text-[10px] font-medium whitespace-nowrap">{t("nav.home")}</span>
        </Link>
        
        <Link href="/vastu" data-tour="nav-vastu" className={clsx("flex flex-col items-center justify-center gap-1 transition-colors", pathname === "/vastu" ? "text-gold" : "text-muted")}>
          <Compass size={22} />
          <span className="text-[10px] font-medium whitespace-nowrap">{t("nav.vastu")}</span>
        </Link>
        
        {/* Central Ask AI button */}
        <div className="flex justify-center -mt-8" data-tour="ask-ai">
          <Link href="/ai-chat" className="relative">
            <div className="absolute inset-0 bg-gold/20 rounded-full blur-xl scale-150" />
            <div className="relative w-16 h-16 rounded-full border border-gold/50 bg-fab flex items-center justify-center text-gold shadow-[0_0_20px_rgba(223,181,100,0.3)]">
              <Sparkles size={24} />
            </div>
            <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-medium text-gold whitespace-nowrap">{t("nav.askAI")}</span>
          </Link>
        </div>

        <Link href="/horoscope" data-tour="nav-horoscope" className={clsx("flex flex-col items-center justify-center gap-1 transition-colors", pathname === "/horoscope" ? "text-gold" : "text-muted")}>
          <Moon size={22} />
          <span className="text-[10px] font-medium whitespace-nowrap">{t("nav.horoscope")}</span>
        </Link>

        <Link href="/panchang" data-tour="nav-panchang" className={clsx("flex flex-col items-center justify-center gap-1 transition-colors", pathname === "/panchang" ? "text-gold" : "text-muted")}>
          <CalendarDays size={22} />
          <span className="text-[10px] font-medium whitespace-nowrap">{t("nav.panchang")}</span>
        </Link>
        
      </div>
    </nav>
  );
}
