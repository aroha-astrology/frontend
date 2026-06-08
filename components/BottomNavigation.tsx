"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, Sparkles, Moon, Flame } from "lucide-react";
import { clsx } from "clsx";

export default function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gold/20 bg-[#0a0a0c]/95 backdrop-blur-xl h-20 rounded-t-[2.5rem]">
      <div className="relative grid grid-cols-5 h-full max-w-lg mx-auto items-center">

        <Link href="/" className={clsx("flex flex-col items-center justify-center gap-1 transition-colors", pathname === "/" ? "text-gold" : "text-[#A39E8A]")}>
          <Home size={22} className={pathname === "/" ? "fill-gold" : ""} />
          <span className="text-[10px] font-medium">Home</span>
        </Link>

        <Link href="/kundli" className={clsx("flex flex-col items-center justify-center gap-1 transition-colors", pathname === "/kundli" ? "text-gold" : "text-[#A39E8A]")}>
          <LayoutGrid size={22} />
          <span className="text-[10px] font-medium">Kundli</span>
        </Link>

        {/* Central Ask AI button */}
        <div className="flex justify-center -mt-8">
          <Link href="/ai-chat" className="relative">
            <div className="absolute inset-0 bg-gold/20 rounded-full blur-xl scale-150" />
            <div className="relative w-16 h-16 rounded-full border border-gold/50 bg-[#1a150c] flex items-center justify-center text-gold shadow-[0_0_20px_rgba(223,181,100,0.3)]">
              <Sparkles size={24} />
            </div>
            <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-medium text-gold whitespace-nowrap">Ask AI</span>
          </Link>
        </div>

        <Link href="/horoscope" className={clsx("flex flex-col items-center justify-center gap-1 transition-colors", pathname === "/horoscope" ? "text-gold" : "text-[#A39E8A]")}>
          <Moon size={22} />
          <span className="text-[10px] font-medium">Horoscope</span>
        </Link>

        <Link href="/remedies" className={clsx("flex flex-col items-center justify-center gap-1 transition-colors", pathname === "/remedies" ? "text-gold" : "text-[#A39E8A]")}>
          <Flame size={22} />
          <span className="text-[10px] font-medium">Remedies</span>
        </Link>

      </div>
    </nav>
  );
}
