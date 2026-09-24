"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { CalendarSearch, ChevronRight } from "lucide-react";
import Card from "@/components/ui/Card";
import { useNewFeature } from "@/hooks/useFeature";

/** Panchang page entry to Find My Date (panchang.findMyDate, ships off). */
export default function FindMyDateCard() {
  const { t } = useTranslation();
  const { enabled } = useNewFeature("panchang.findMyDate");
  if (!enabled) return null;
  return (
    <Link href="/find-date" className="block" data-testid="find-my-date-card">
      <Card className="p-4 border-gold/15 flex items-center gap-3">
        <CalendarSearch size={20} className="text-gold shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{t("findDate.card.title")}</p>
          <p className="text-[11px] text-muted leading-snug">{t("findDate.card.body")}</p>
        </div>
        <span className="flex items-center text-xs font-medium text-gold">
          {t("findDate.card.cta")}
          <ChevronRight size={14} />
        </span>
      </Card>
    </Link>
  );
}
