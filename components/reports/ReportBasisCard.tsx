"use client";

import { useTranslation } from "react-i18next";
import type { ReportBasis, ReportBasisRule } from "@/lib/reports-api";

/**
 * "How this report is made" — the basis block every report carries since the engine audit
 * (backend rules/report-basis.ts). Collapsed by default; it lists the rules behind the report
 * by where they come from, so a rule from a modern system or Aroha's own scoring is never
 * presented as an old text. Rule names come from the backend as they are; the group titles
 * are translated.
 */
const GROUPS: Array<{ field: keyof Pick<ReportBasis, "traditional_rules" | "modern_rules" | "aroha_proprietary_rules" | "unverified_rules">; labelKey: string }> = [
  { field: "traditional_rules", labelKey: "reports.basis.traditional" },
  { field: "modern_rules", labelKey: "reports.basis.modern" },
  { field: "aroha_proprietary_rules", labelKey: "reports.basis.aroha" },
  { field: "unverified_rules", labelKey: "reports.basis.unverified" },
];

export default function ReportBasisCard({ basis }: { basis: ReportBasis }) {
  const { t } = useTranslation();
  const groups = GROUPS.map((g) => ({ ...g, rules: basis[g.field] as ReportBasisRule[] })).filter((g) => g.rules.length > 0);
  return (
    <details className="rounded-2xl border border-gold/15 bg-card p-3.5" data-testid="report-basis">
      <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wider text-muted">
        {t("reports.basis.title")}
      </summary>
      <p className="mt-2 text-xs text-foreground/80">{t("reports.basis.intro")}</p>
      {groups.map((g) => (
        <div key={g.field} className="mt-3">
          <h3 className="text-xs font-semibold text-gold">{t(g.labelKey)}</h3>
          <p className="mt-1 text-xs text-foreground/70">{g.rules.map((r) => r.name).join(" · ")}</p>
        </div>
      ))}
      <p className="mt-3 text-[11px] text-muted">{t("reports.basis.note")}</p>
    </details>
  );
}
