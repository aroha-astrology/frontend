"use client";

import Link from "next/link";
import { ChevronRight, Flame } from "lucide-react";
import { useTranslation } from "react-i18next";
import Card from "@/components/ui/Card";

/** Home-screen entry point for Remedies — same card shell as ShlokasCard.tsx.
 * Badge is a lucide icon for now; swap to the cropped Lal Kitab book image
 * (public/remedies/hero/) once that asset lands. */
export default function RemediesCard() {
  const { t } = useTranslation();
  return (
    <Link href="/remedies">
      <Card
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="w-full overflow-hidden flex flex-row items-center justify-between p-5 hover:border-gold/40 cursor-pointer active:scale-[0.98] transition-transform"
      >
        <div className="flex items-center gap-4 flex-1">
          <div className="relative w-16 h-16 rounded-full border border-gold/40 flex items-center justify-center text-gold overflow-hidden shrink-0">
            <div className="absolute inset-0 bg-gold/5 blur-sm" />
            <Flame size={28} className="z-10 text-gold" />
          </div>
          <div className="flex-1 pr-2">
            <h3 className="text-lg font-display text-gold mb-1 leading-tight">{t("home.remedies")}</h3>
            <p className="text-xs text-muted leading-relaxed">{t("home.remediesDesc")}</p>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full border border-gold flex items-center justify-center text-gold shrink-0">
          <ChevronRight size={16} />
        </div>
      </Card>
    </Link>
  );
}
