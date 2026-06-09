"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { MessageSquareText } from "lucide-react";
import { GiMagicPortal } from "react-icons/gi";
import { useTranslation } from "react-i18next";
import OutlineButton from "@/components/ui/OutlineButton";
import BrandLogo from "@/components/ui/BrandLogo";

export default function Hero() {
  const { t } = useTranslation();
  return (
    <div className="px-5 pt-8 pb-6 text-center relative z-10">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center"
      >
        {/* Logo Section */}
        <div className="mb-6 flex flex-col items-center">
          <BrandLogo size={200} priority className="drop-shadow-[0_0_15px_rgba(223,181,100,0.4)]" />
        </div>

        {/* Brand wordmark — Cinzel Decorative for the sweeping-crossbar "A".
            Kept as a literal wordmark (brand name, not translated). */}
        <div className="mb-10 flex flex-col items-center select-none">
          <h1 className="font-display-decorative text-gold text-[36px] font-normal leading-none tracking-[0.25em] pl-[0.25em] drop-shadow-[0_0_18px_rgba(212,175,55,0.4)]">
            AROHA
          </h1>
          <div className="mt-3 flex items-center gap-3">
            <span className="h-px w-9 bg-gold/30" />
            <span className="font-display text-[10px] tracking-[0.5em] pl-[0.5em] text-gold/70">
              ASTROLOGY
            </span>
            <span className="h-px w-9 bg-gold/30" />
          </div>
        </div>

        {/* Main Title */}
        <h2 className="text-[44px] font-serif text-foreground leading-[1.15] mb-6 tracking-wide drop-shadow-[0_0_12px_rgba(212,175,55,0.3)]">
          {t("hero.aiPowered")}<br />
          <span className="text-gold">{t("hero.vedicGuidance")}</span>
        </h2>
        <p className="mt-4 text-[12px] text-muted max-w-[280px] mx-auto leading-[1.6] tracking-wide font-light">
          {t("hero.tagline1")}<br />
          {t("hero.tagline2")}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="mt-10 flex flex-row gap-4 justify-center w-full max-w-[340px] mx-auto"
      >
        <Link href="/kundli" className="flex-1">
          <OutlineButton>
            <GiMagicPortal size={18} className="text-gold" />
            {t("hero.generateKundli")}
          </OutlineButton>
        </Link>
        <Link href="/ai-chat" className="flex-1">
          <OutlineButton>
            <MessageSquareText size={16} className="text-gold" />
            {t("hero.talkToAI")}
          </OutlineButton>
        </Link>
      </motion.div>
    </div>
  );
}
