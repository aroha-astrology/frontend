"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import Card from "@/components/ui/Card";
import StatusPill, { strengthPillTone } from "@/components/ui/StatusPill";
import PlanetIcon from "./PlanetIcon";
import { zodiacSignLabel } from "@/data/zodiac";
import type { SeventhHouseFacts } from "@/lib/marriage-report-view";

/**
 * The 7th house read — the house of marriage — as the mock's chart-preview card.
 *
 * Deliberately NOT drawing a kundli here: `scores` carries the 7th house's sign, lord,
 * lord strength and temperament, but not the planet/house positions a chart needs, and
 * fetching a whole chart just for a thumbnail would be new data on a screen specced as
 * a pure re-presentation. The "View Full Chart" link goes to /kundli, which already
 * renders the real thing.
 */
export default function SeventhHouseCard({ facts }: { facts: SeventhHouseFacts }) {
  const { t } = useTranslation();
  const rows: { label: string; value: string }[] = [];

  if (facts.sign) {
    rows.push({ label: t("marriageReport.seventhHouse.sign"), value: zodiacSignLabel(t, facts.sign) });
  }
  if (facts.lord) {
    rows.push({ label: t("marriageReport.seventhHouse.lord"), value: facts.lord });
  }
  if (facts.temperament) {
    rows.push({ label: t("marriageReport.seventhHouse.temperament"), value: facts.temperament });
  }
  if (rows.length === 0) return null;

  return (
    <section>
      <h2 className="font-display text-base text-gold mb-2">{t("marriageReport.seventhHouse.title")}</h2>
      <Card className="p-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          {facts.lord && <PlanetIcon planet={facts.lord.toLowerCase()} size={40} />}
          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
            {rows.map((row) => (
              <div key={row.label} className="flex items-baseline justify-between gap-3">
                <span className="text-[11px] text-muted shrink-0">{row.label}</span>
                <span className="text-[11px] font-medium text-foreground text-right">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {facts.strength && (
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-gold/10">
            <span className="text-[11px] text-muted">{t("marriageReport.seventhHouse.strength")}</span>
            <StatusPill tone={strengthPillTone(facts.strength)}>
              {t(`marriageReport.strength.${facts.strength}`)}
            </StatusPill>
          </div>
        )}

        <Link
          href="/kundli"
          className="flex items-center justify-center gap-1.5 rounded-xl border border-gold/30 px-3 py-2.5 text-xs font-semibold text-gold"
        >
          {t("marriageReport.seventhHouse.viewChart")}
          <ArrowRight size={14} aria-hidden />
        </Link>
      </Card>
    </section>
  );
}
