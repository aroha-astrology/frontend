"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import Image from "next/image";
import ZodiacSilhouette from "./ZodiacSilhouette";
import { useTranslation } from "react-i18next";
import Card from "@/components/ui/Card";

export default function AIChatPreview() {
  const { t } = useTranslation();
  return (
    <Card
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative w-full overflow-hidden flex flex-row items-center justify-between p-6 shadow-[0_4px_30px_rgba(0,0,0,0.5)]"
    >
      {/* Glow effect */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gold/10 rounded-full blur-3xl pointer-events-none" />

      {/* Left content */}
      <div className="z-10 flex-1 pr-4">
        <p className="text-foreground/80 text-sm mb-1 tracking-wide">{t("home.yourPersonal")}</p>
        <h3 className="text-2xl font-display text-gold mb-3 leading-tight tracking-wide">
          {t("home.aiAstrologer")}
        </h3>

        <Link href="/ai-chat">
          <button className="flex items-center gap-2 mt-2 py-2 px-0 transition-all text-gold text-sm tracking-wide">
            {t("common.chatNow")} <Sparkles size={14} className="text-gold" />
          </button>
        </Link>
      </div>

      {/* Right image */}
      <div className="relative w-[150px] h-[180px] -mr-6 -my-6 shrink-0 flex items-end justify-center">
        {/* Zodiac wheel background */}
        <div className="absolute inset-0 flex items-center justify-center translate-x-4 opacity-60">
          <ZodiacSilhouette src="/zodiac_wheel.png" className="w-[180px] h-[180px] text-gold drop-shadow-[0_0_10px_rgba(223,181,100,0.4)]" />
        </div>
        
        <Image
          src="/sage.png"
          alt="AI Astrologer"
          fill
          className="object-cover object-bottom z-10 translate-y-6 scale-[1.15]"
        />
        
        {/* Badge removed as it's not in the mockup for this specific section */}
      </div>
    </Card>
  );
}
