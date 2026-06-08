"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { MessageSquareText } from "lucide-react";
import { GiLotusFlower, GiMagicPortal } from "react-icons/gi";
import { useTranslation } from "react-i18next";
import OutlineButton from "@/components/ui/OutlineButton";

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
        <div className="mb-16 flex flex-col items-center">
          <GiLotusFlower className="w-14 h-14 text-gold mb-2 drop-shadow-[0_0_8px_rgba(223,181,100,0.4)]" />
          <h1 className="text-[28px] font-normal tracking-[0.25em] text-gold font-display leading-none mt-2">
            AROHA
          </h1>
          <p className="text-[10px] tracking-[0.45em] text-foreground/70 uppercase mt-3 font-light">
            {t("hero.astrology")}
          </p>
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
