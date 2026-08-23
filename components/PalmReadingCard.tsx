"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import Card from "@/components/ui/Card";

/** Home-screen entry point for Palm Reading — same card shell as MatchMakingCard.tsx.
 *
 * The hero art carries small English line labels baked into the illustration. It is used at
 * 64px here deliberately: at that size they read as texture. The labels a user actually reads
 * — the ones drawn on their OWN photograph — are t() keys, translated in all seven languages
 * (see PalmAnnotatedView / palm.line.*). */
export default function PalmReadingCard() {
  const { t } = useTranslation();
  return (
    <Link href="/palm">
      <Card
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="w-full overflow-hidden flex flex-row items-center justify-between p-5 hover:border-gold/40 cursor-pointer active:scale-[0.98] transition-transform"
      >
        <div className="flex items-center gap-4 flex-1">
          <div className="relative w-16 h-16 rounded-full border border-gold/40 flex items-center justify-center text-gold overflow-hidden shrink-0">
            <div className="absolute inset-0 bg-gold/5 blur-sm" />
            <Image
              src="/palm/hero.png"
              alt=""
              width={64}
              height={64}
              className="relative z-10 h-full w-full object-cover"
            />
          </div>
          <div className="flex-1 pr-2">
            <h3 className="text-lg font-display text-gold mb-1 leading-tight">{t("home.palmReading")}</h3>
            <p className="text-xs text-muted leading-relaxed">{t("home.palmReadingDesc")}</p>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full border border-gold flex items-center justify-center text-gold shrink-0">
          <ChevronRight size={16} />
        </div>
      </Card>
    </Link>
  );
}
