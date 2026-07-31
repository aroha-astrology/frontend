"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import Card from "@/components/ui/Card";
import { GemVisual } from "@/components/ui/GemstoneCard";
import type { ReportGemstone } from "@/lib/report-score-facts";

/**
 * Report-scoped gemstone card — lighter than the standalone paid gemstone feature's GemRow
 * (no mantra/alternatives/verify-authenticity, no AI-generated note): just why this stone
 * matters for THIS report (`role`/`benefit`, backend-authored prose, translated server-side —
 * see jyotish-backend's SCORES_PROSE_ALLOWLIST) plus the static finger/metal/day/weight/dos/
 * don'ts facts already fully translated in `kundli.gemstone.data.<planet>.*` (same i18n table
 * the standalone feature reads — reused here, not duplicated).
 */
function GemstoneRow({ gem }: { gem: ReportGemstone }) {
  const { t } = useTranslation();
  const [showDetails, setShowDetails] = useState(false);
  const dataKey = (field: string) => `kundli.gemstone.data.${gem.planet}.${field}`;
  const gemName = t(dataKey("gemName"));
  const dos = t(dataKey("dos"), { returnObjects: true }) as string[];
  const staticDonts = t(dataKey("donts"), { returnObjects: true }) as string[];
  const donts = gem.conditionalCautionApplies
    ? [...staticDonts, t(dataKey("conditionalDont"))]
    : staticDonts;

  const facts: { label: string; value: string }[] = [
    { label: t("kundli.gemstone.finger"), value: t(dataKey("finger")) },
    { label: t("kundli.gemstone.metal"), value: t(dataKey("metal")) },
    { label: t("kundli.gemstone.dayToWear"), value: t(dataKey("dayToWear")) },
  ];

  return (
    <div
      className={`rounded-2xl border p-3.5 ${gem.conditionalCautionApplies ? "border-amber-500/25 bg-amber-500/[0.04]" : "border-border bg-surface/40"}`}
    >
      <div className="flex items-start gap-3">
        <GemVisual color={gem.color} planet={gem.planet} size={40} />
        <div className="min-w-0 flex-1">
          <span className="text-sm font-bold text-foreground">{gemName}</span>
          <p className="mt-0.5 text-[11px] leading-relaxed text-foreground/85">{gem.role}</p>
        </div>
      </div>

      <div className="mt-2.5 rounded-xl border border-gold/15 bg-gold/[0.05] p-2.5">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-muted">
          {t("reports.gemstones.benefit")}
        </p>
        <p className="mt-0.5 text-xs text-foreground/90">{gem.benefit}</p>
      </div>

      <div className="mt-2.5 grid grid-cols-3 gap-x-2 gap-y-1.5">
        {facts.map(({ label, value }) => (
          <div key={label} className="flex flex-col">
            <span className="text-[9px] uppercase tracking-wider text-muted">{label}</span>
            <span className="text-[11px] font-medium text-foreground">{value}</span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setShowDetails((v) => !v)}
        className="mt-2.5 text-[11px] text-gold underline-offset-2 hover:underline"
      >
        {showDetails ? t("kundli.gemstone.hideCareDetails") : t("kundli.gemstone.showCareDetails")}
      </button>

      {showDetails && (
        <div className="mt-2.5 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-[10px] font-semibold text-emerald-400">{t("kundli.gemstone.dos")}</p>
            <ul className="space-y-1">
              {dos.map((d, i) => (
                <li key={i} className="flex gap-1.5 text-[10px] leading-snug text-muted">
                  <span className="shrink-0 text-emerald-400">+</span>
                  {d}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-semibold text-red-400">{t("kundli.gemstone.donts")}</p>
            <ul className="space-y-1">
              {donts.map((d, i) => (
                <li key={i} className="flex gap-1.5 text-[10px] leading-snug text-muted">
                  <span className="shrink-0 text-red-400">−</span>
                  {d}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

/** Recommended-stone order (higher `preference` = more strongly recommended, matching the
 * standalone gemstone feature's own sort — see GemstoneCard.tsx). */
export default function ReportGemstonesCard({ gemstones }: { gemstones: ReportGemstone[] }) {
  const { t } = useTranslation();
  const sorted = [...gemstones].sort((a, b) => b.preference - a.preference);

  return (
    <div className="flex flex-col gap-3">
      {sorted.map((gem) => (
        <GemstoneRow key={gem.planet} gem={gem} />
      ))}
      <p className="text-center text-[10px] leading-relaxed text-muted/80">
        {t("reports.gemstones.consultFirst")}
      </p>
    </div>
  );
}
