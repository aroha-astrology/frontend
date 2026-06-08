"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, Sparkles, Moon, Flame } from "lucide-react";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";

export default function BottomNavigation() {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gold/20 bg-surface/95 backdrop-blur-xl h-20 rounded-t-[2.5rem]">
      <div className="relative grid grid-cols-5 h-full max-w-lg mx-auto items-center">
        
        <Link href="/" className={clsx("flex flex-col items-center justify-center gap-1 transition-colors", pathname === "/" ? "text-gold" : "text-muted")}>
          <Home size={22} className={pathname === "/" ? "fill-gold" : ""} />
          <span className="text-[10px] font-medium">{t("nav.home")}</span>
        </Link>
        
        <Link href="/kundli" className={clsx("flex flex-col items-center justify-center gap-1 transition-colors", pathname === "/kundli" ? "text-gold" : "text-muted")}>
          <LayoutGrid size={22} />
          <span className="text-[10px] font-medium">{t("nav.kundli")}</span>
        </Link>
        
        {/* Central Ask AI button */}
        <div className="flex justify-center -mt-8">
          <Link href="/ai-chat" className="relative">
            <div className="absolute inset-0 bg-gold/20 rounded-full blur-xl scale-150" />
            <div className="relative w-16 h-16 rounded-full border border-gold/50 bg-fab flex items-center justify-center text-gold shadow-[0_0_20px_rgba(223,181,100,0.3)]">
              <Sparkles size={24} />
            </div>
            <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-medium text-gold whitespace-nowrap">{t("nav.askAI")}</span>
          </Link>
        </div>
        
        <Link href="/horoscope" className={clsx("flex flex-col items-center justify-center gap-1 transition-colors", pathname === "/horoscope" ? "text-gold" : "text-muted")}>
          <Moon size={22} />
          <span className="text-[10px] font-medium">{t("nav.horoscope")}</span>
        </Link>
        
        <Link href="/remedies" className={clsx("flex flex-col items-center justify-center gap-1 transition-colors", pathname === "/remedies" ? "text-gold" : "text-muted")}>
          <Flame size={22} />
          <span className="text-[10px] font-medium">{t("nav.remedies")}</span>
        </Link>
        
      </div>
    </nav>
  );
}
