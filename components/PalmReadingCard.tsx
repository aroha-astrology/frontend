"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import Card from "@/components/ui/Card";

/** Home-screen entry point for Palm Reading — same card shell as MatchMakingCard.tsx. */
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
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 z-10 text-gold">
              <path d="M8 12V6a1.5 1.5 0 0 1 3 0v4M11 10V4.5a1.5 1.5 0 0 1 3 0V10M14 10.5V5.5a1.5 1.5 0 0 1 3 0v7.5M17 11v2.5a1.5 1.5 0 0 1 3 0v3.5c0 3-2 6-6 6h-2c-3 0-4.5-1.5-6-4l-1.8-3.2a1.4 1.4 0 0 1 2.3-1.6L8 16" />
            </svg>
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
