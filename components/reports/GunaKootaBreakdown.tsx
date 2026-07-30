"use client";

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export interface KootaEntry {
  name: string;
  score: number;
  maxScore: number;
  description: string;
}

/**
 * Maps backend koota names to their i18n label + meaning keys. Backend emits
 * "GrahaMaitri" but the display label is "Maitri". Extracted from
 * app/compatibility/page.tsx (previously the only place this rendered
 * correctly) so match_report AND kundli_milan both get it, regardless of
 * purchase/view path — see report-score-facts.ts's isKootaBreakdownArray.
 */
const KOOTA_INFO: Record<string, { labelKey: string; meaningKey: string }> = {
  Varna:       { labelKey: "compatibilityPage.kootaLabel.Varna",       meaningKey: "compatibilityPage.kootaMeaning.Varna" },
  Vashya:      { labelKey: "compatibilityPage.kootaLabel.Vashya",      meaningKey: "compatibilityPage.kootaMeaning.Vashya" },
  Tara:        { labelKey: "compatibilityPage.kootaLabel.Tara",        meaningKey: "compatibilityPage.kootaMeaning.Tara" },
  Yoni:        { labelKey: "compatibilityPage.kootaLabel.Yoni",        meaningKey: "compatibilityPage.kootaMeaning.Yoni" },
  GrahaMaitri: { labelKey: "compatibilityPage.kootaLabel.GrahaMaitri", meaningKey: "compatibilityPage.kootaMeaning.GrahaMaitri" },
  Gana:        { labelKey: "compatibilityPage.kootaLabel.Gana",        meaningKey: "compatibilityPage.kootaMeaning.Gana" },
  Bhakoot:     { labelKey: "compatibilityPage.kootaLabel.Bhakoot",     meaningKey: "compatibilityPage.kootaMeaning.Bhakoot" },
  Nadi:        { labelKey: "compatibilityPage.kootaLabel.Nadi",        meaningKey: "compatibilityPage.kootaMeaning.Nadi" },
};

/**
 * Self-contained koota/guna score breakdown — computes total/max/verdict/red-flags from
 * `entries` alone (no sibling `gunaMilanScore`/`gunaMaxScore` fields required), so it works
 * identically for gunaBreakdown (36-point Ashtakoota) and dashakootaBreakdown (10-point
 * Dashakoota) without extra props. Koota names not in KOOTA_INFO (e.g. Dashakoota's own 10
 * porutham names) gracefully fall back to the raw `name`/`description` instead of a translated
 * label/meaning.
 */
export default function GunaKootaBreakdown({ entries }: { entries: KootaEntry[] }) {
  const { t } = useTranslation();

  const totalScore = entries.reduce((sum, k) => sum + k.score, 0);
  const maxTotal = entries.reduce((sum, k) => sum + k.maxScore, 0);
  const pct = maxTotal > 0 ? Math.round((totalScore / maxTotal) * 100) : 0;
  const redFlags = entries.filter((k) => (k.name === "Nadi" || k.name === "Bhakoot") && k.score === 0);
  const verdictColor = pct >= 75 ? "text-green-400" : pct >= 50 ? "text-yellow-400" : "text-red-400";
  const verdictLabel =
    pct >= 75
      ? t("compatibilityPage.excellentMatch")
      : pct >= 50
        ? t("compatibilityPage.goodMatch")
        : t("compatibilityPage.needsAttention");

  return (
    <div className="space-y-5">
      {redFlags.map((k) => (
        <div key={k.name} className="p-3 rounded-xl border border-red-500/40 bg-red-500/10 text-red-400 text-sm">
          ⚠ {t("compatibilityPage.doshaFlag", { koota: k.name, max: k.maxScore })} {k.description}
        </div>
      ))}

      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gold font-display">
              {t("compatibilityPage.gunasScore", { total: totalScore, max: maxTotal })}
            </h2>
            <p className={`${verdictColor} text-sm font-medium mt-0.5`}>
              {verdictLabel} {pct >= 50 && redFlags.length === 0 ? "✓" : ""}
            </p>
          </div>
          <div className="text-4xl">💍</div>
        </div>

        <div className="h-3 rounded-full" style={{ background: "var(--secondary)" }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1, delay: 0.2 }}
            className="h-3 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full"
          />
        </div>
      </div>

      <div className="space-y-3">
        {entries.map((koota) => {
          const info = KOOTA_INFO[koota.name];
          const meaning = info?.meaningKey ? t(info.meaningKey) : null;
          return (
            <div
              key={koota.name}
              className="p-3 rounded-xl border"
              style={{ borderColor: "var(--border)", background: "var(--background)" }}
            >
              <div className="flex justify-between items-start gap-3">
                <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                  {info ? t(info.labelKey) : koota.name}
                </span>
                <span className={`text-sm font-bold shrink-0 ${koota.score === 0 ? "text-red-400" : "text-gold"}`}>
                  {koota.score}/{koota.maxScore}
                </span>
              </div>
              {meaning && (
                <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  {meaning}
                </p>
              )}
              {!info && koota.description && (
                <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  {koota.description}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
