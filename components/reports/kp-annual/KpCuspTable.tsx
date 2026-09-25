"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import Card from "@/components/ui/Card";
import type { KpCuspView } from "@/lib/kp-annual-report-view";
import { cn } from "@/lib/utils";

/**
 * The KP chart itself — all twelve Placidus cusps with their sign, star lord and sub lord —
 * collapsed by default. It is the evidence behind every verdict above, for the reader (or
 * their astrologer) who wants to check it.
 */
export default function KpCuspTable({ cusps }: { cusps: KpCuspView[] }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  if (cusps.length === 0) return null;
  const planet = (p: string) => t(`planetNames.${p.toLowerCase()}`, { defaultValue: p });
  return (
    <Card className="rounded-2xl p-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3.5 py-3 text-left"
        aria-expanded={open}
      >
        <span className="font-display text-sm text-gold">{t("kpAnnualReport.cusps.title")}</span>
        <ChevronDown size={16} className={cn("text-muted transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="px-3 pb-3">
          <table className="w-full text-left text-[11px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted">
                <th className="py-1 font-medium">{t("kpAnnualReport.cusps.house")}</th>
                <th className="py-1 font-medium">{t("kpAnnualReport.cusps.sign")}</th>
                <th className="py-1 font-medium">{t("kpAnnualReport.cusps.star")}</th>
                <th className="py-1 font-medium">{t("kpAnnualReport.cusps.sub")}</th>
              </tr>
            </thead>
            <tbody>
              {cusps.map((c) => (
                <tr key={c.house} className="border-t border-gold/10 text-foreground/85">
                  <td className="py-1.5 font-semibold text-gold">
                    {c.house}
                    {c.sensitive && <span className="ml-0.5 text-amber-300">*</span>}
                  </td>
                  <td className="py-1.5">{c.sign}</td>
                  <td className="py-1.5">{planet(c.starLord)}</td>
                  <td className="py-1.5 font-medium text-foreground">{planet(c.subLord)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {cusps.some((c) => c.sensitive) && (
            <p className="mt-2 text-[10px] leading-snug text-muted">
              <span className="text-amber-300">*</span> {t("kpAnnualReport.cusps.sensitiveNote")}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
