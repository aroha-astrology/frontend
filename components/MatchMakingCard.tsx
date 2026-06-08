"use client";

import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import Card from "@/components/ui/Card";

export default function MatchMakingCard() {
  const { t } = useTranslation();
  return (
    <Card
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="w-full overflow-hidden flex flex-row items-center justify-between p-5 hover:border-gold/40 cursor-pointer"
    >
      <div className="flex items-center gap-4 flex-1">
        {/* Circle with two silhouettes */}
        <div className="relative w-16 h-16 rounded-full border border-gold/40 flex items-center justify-center text-gold overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-gold/5 blur-sm" />
          {/* Silhouettes - simple SVG representation */}
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 z-10 text-gold">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
          <div className="absolute -top-1 text-gold text-xs">✨</div>
        </div>
        
        <div className="flex-1 pr-2">
          <h3 className="text-lg font-display text-gold mb-1 leading-tight">
            {t("home.matchMaking")}
          </h3>
          <p className="text-xs text-muted leading-relaxed">
            {t("home.matchMakingDesc")}
          </p>
        </div>
      </div>
      
      <div className="w-8 h-8 rounded-full border border-gold flex items-center justify-center text-gold shrink-0">
        <ChevronRight size={16} />
      </div>
    </Card>
  );
}
