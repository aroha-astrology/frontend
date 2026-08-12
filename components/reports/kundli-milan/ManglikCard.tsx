"use client";

import { useTranslation } from "react-i18next";
import { Flame, ShieldCheck } from "lucide-react";
import Card from "@/components/ui/Card";
import StatusPill from "@/components/ui/StatusPill";
import type { ManglikState } from "@/lib/kundli-milan-report-view";

/**
 * Mangal Dosha, per person — the only genuinely two-sided fact this report computes
 * (header, gemstones and the dosha/yoga summary are all scoped to the purchasing user's
 * chart by backend design, so nothing else on this screen gets a You/Partner treatment).
 *
 * The verdict deliberately keys off `matched`, not off either person's flag: Mangal Dosha
 * is classically a problem when it is ONE-SIDED, so two manglik partners read as fine.
 * That is the same rule app/compatibility/page.tsx applies to this field, kept identical
 * so the free matcher and the paid report cannot contradict each other on two given charts.
 */
export default function ManglikCard({ manglik }: { manglik: ManglikState }) {
  const { t } = useTranslation();

  const person = (present: boolean, labelKey: string) => (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <span className="text-xs text-muted">{t(labelKey)}</span>
      <StatusPill tone={present ? "neutral" : "positive"}>
        {t(present ? "kundliMilanReport.manglik.present" : "kundliMilanReport.manglik.absent")}
      </StatusPill>
    </div>
  );

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <Flame size={15} className="text-gold shrink-0" aria-hidden />
        <h2 className="font-display text-sm text-foreground flex-1">
          {t("kundliMilanReport.manglik.title")}
        </h2>
        <StatusPill tone={manglik.matched ? "positive" : "caution"}>
          {t(
            manglik.matched
              ? "kundliMilanReport.manglik.matched"
              : "kundliMilanReport.manglik.mismatched",
          )}
        </StatusPill>
      </div>

      <div className="divide-y divide-border">
        {person(manglik.person1, "kundliMilanReport.manglik.you")}
        {person(manglik.person2, "kundliMilanReport.manglik.partner")}
      </div>

      {manglik.cancelled && (
        <p className="mt-2.5 flex items-start gap-1.5 text-[11px] leading-snug text-muted">
          <ShieldCheck size={13} className="text-emerald-400 shrink-0 mt-px" aria-hidden />
          {t("kundliMilanReport.manglik.cancelledNote")}
        </p>
      )}
    </Card>
  );
}
