"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import Card from "@/components/ui/Card";

export default function MatchMakingCard() {
  const { t } = useTranslation();
  return (
    <Link href="/compatibility">
    <Card
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="w-full overflow-hidden flex flex-row items-center justify-between p-5 hover:border-gold/40 cursor-pointer active:scale-[0.98] transition-transform"
    >
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-16 h-16 rounded-full border border-gold/40 overflow-hidden shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/match_making.png" alt="" className="w-full h-full object-cover" />
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
    </Link>
  );
}
