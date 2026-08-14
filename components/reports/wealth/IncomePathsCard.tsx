"use client";

import { useTranslation } from "react-i18next";
import { Briefcase, Home, Store, type LucideIcon } from "lucide-react";
import Card from "@/components/ui/Card";
import StatusPill, { strengthPillTone } from "@/components/ui/StatusPill";
import type { IncomePath, IncomeSource } from "@/lib/wealth-report-view";

const PATH_ICON: Record<IncomeSource, LucideIcon> = {
  salaried: Briefcase,
  business: Store,
  property: Home,
};

/**
 * The three classical income-source houses — 10th (salaried), 7th (business), 4th (property) —
 * each with its lord's natal strength, and the backend's own pick highlighted.
 *
 * The highlight comes from `strongestIncomeSource`, never re-derived here by comparing the three
 * strengths: the backend breaks ties in a documented order (salaried > business > property) using
 * the underlying numeric scores, which this screen never receives. Recomputing from the
 * three coarse weak/average/strong labels would disagree with the narrative on any tie.
 */
export default function IncomePathsCard({ paths }: { paths: IncomePath[] }) {
  const { t } = useTranslation();
  if (paths.length === 0) return null;

  return (
    <section>
      <h2 className="font-display text-base text-gold mb-2">{t("wealthReport.income.title")}</h2>
      <Card className="p-3 flex flex-col gap-2">
        {paths.map((path) => {
          const Icon = PATH_ICON[path.key];
          return (
            <div
              key={path.key}
              className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 ${
                path.strongest
                  ? "border-gold/40 bg-gold/[0.07]"
                  : "border-border bg-background/40"
              }`}
            >
              <Icon size={16} className={path.strongest ? "text-gold" : "text-muted"} aria-hidden />
              {/* "Strongest" sits on the sub-line rather than in its own column: as a sibling of
                  the title it competed for width and wrapped the path name in languages with
                  longer superlatives (Tamil's "மிக வலிமையானது"). */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">
                  {t(`wealthReport.income.path.${path.key}`)}
                </p>
                <p className="text-[10px] text-muted mt-0.5">
                  {t(`wealthReport.income.house.${path.key}`)}
                  {path.strongest && (
                    <span className="text-gold font-semibold">
                      {" · "}
                      {t("wealthReport.income.strongest")}
                    </span>
                  )}
                </p>
              </div>
              <StatusPill tone={strengthPillTone(path.strength)}>
                {t(`wealthReport.strength.${path.strength}`)}
              </StatusPill>
            </div>
          );
        })}
      </Card>
    </section>
  );
}
