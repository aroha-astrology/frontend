"use client";

import { useTranslation } from "react-i18next";
import { CheckCircle2, XCircle, Sparkles } from "lucide-react";
import type { ReportSection } from "@/lib/reports-api";

interface DosAndDontsCardProps {
  /** sections[8..10] — Do's, Don'ts, Classical Remedies, in that fixed order (see
   * match-report.ts's LLM module doc comment). */
  closingSections: ReportSection[];
}

export default function DosAndDontsCard({ closingSections }: DosAndDontsCardProps) {
  const { t } = useTranslation();
  const [dos, donts, remedies] = closingSections;
  if (!dos && !donts && !remedies) return null;

  return (
    <div className="rounded-2xl border border-gold/20 bg-card p-4 space-y-4">
      {dos && (
        <div>
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">
            {t("compatibilityPage.report.dos")}
          </p>
          <ul className="space-y-1.5">
            {dos.paragraphs.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-foreground/85 leading-relaxed">
                <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-400" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {donts && (
        <div>
          <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">
            {t("compatibilityPage.report.donts")}
          </p>
          <ul className="space-y-1.5">
            {donts.paragraphs.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-foreground/85 leading-relaxed">
                <XCircle size={14} className="mt-0.5 shrink-0 text-red-400" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {remedies && (
        <div>
          <p className="text-xs font-semibold text-gold uppercase tracking-wider mb-2">
            {t("compatibilityPage.report.remedies")}
          </p>
          <ul className="space-y-1.5">
            {remedies.paragraphs.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-foreground/85 leading-relaxed">
                <Sparkles size={14} className="mt-0.5 shrink-0 text-gold" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
