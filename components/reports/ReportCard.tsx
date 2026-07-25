"use client";

import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import { formatRupees } from "@/lib/format";
import { deriveOneTimeCardState, purchasedMonthChips, formatPeriodMonth } from "@/lib/reports-logic";
import type { ReportCatalogueEntry } from "@/lib/reports-api";

interface ReportCardProps {
  entry: ReportCatalogueEntry;
  /** Opens the purchase drawer for this report — used for the initial Buy AND the Retry CTA (a retry re-opens the same purchase flow, matching this app's other paid-feature retry UX). */
  onBuy: () => void;
  /** Monthly reports only — opens the drawer in month-picker mode. */
  onAddMonths?: () => void;
}

/**
 * One catalogue card — branches on `entry.isMonthly` for two entirely
 * different layouts (a single CTA driven by `deriveOneTimeCardState` vs. a
 * CTA plus a purchased-months chip list), matching the spec's distinct
 * One Time / Monthly tab behaviors.
 */
export default function ReportCard({ entry, onBuy, onAddMonths }: ReportCardProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const label = t(`reports.labels.${entry.key}`, entry.label);

  if (entry.isMonthly) {
    const chips = purchasedMonthChips(entry.purchases);
    return (
      <Card className="p-4 flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{label}</p>
            <p className="text-[11px] text-muted mt-0.5">
              {t("reports.perMonth", { price: formatRupees(entry.pricePaise) })}
            </p>
          </div>
          <button
            type="button"
            onClick={onAddMonths}
            className="shrink-0 rounded-xl bg-gold text-[#1a0e00] px-3.5 py-2.5 text-xs font-bold"
          >
            {chips.length > 0 ? t("reports.addMonths") : t("reports.buy")}
          </button>
        </div>
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <button
                type="button"
                key={c.purchaseId}
                onClick={() => c.status === "ready" && router.push(`/reports/${c.purchaseId}`)}
                disabled={c.status !== "ready"}
                className={`text-[10px] rounded-full px-2.5 py-1 border transition-colors ${
                  c.status === "ready"
                    ? "border-gold/30 text-gold"
                    : c.status === "generating"
                      ? "border-amber-500/30 text-amber-400"
                      : "border-red-500/30 text-red-400"
                }`}
              >
                {formatPeriodMonth(c.periodMonth)}
                {c.status === "generating" && ` · ${t("reports.generating")}`}
                {c.status === "failed" && ` · ${t("reports.retry")}`}
              </button>
            ))}
          </div>
        )}
      </Card>
    );
  }

  const cardState = deriveOneTimeCardState(entry.purchases);
  return (
    <Card className="p-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{label}</p>
        <p className="text-[11px] text-muted mt-0.5">{formatRupees(entry.pricePaise)}</p>
      </div>

      {cardState.state === "none" && (
        <button
          type="button"
          onClick={onBuy}
          className="shrink-0 rounded-xl bg-gold text-[#1a0e00] px-4 py-2.5 text-xs font-bold"
        >
          {t("reports.buy")}
        </button>
      )}

      {cardState.state === "ready" && (
        <button
          type="button"
          onClick={() => router.push(`/reports/${cardState.purchaseId}`)}
          className="shrink-0 rounded-xl border border-gold/30 text-gold px-4 py-2.5 text-xs font-bold"
        >
          {t("reports.viewReport")}
        </button>
      )}

      {cardState.state === "generating" && (
        <button
          type="button"
          onClick={() => router.push(`/reports/${cardState.purchaseId}`)}
          className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 px-3.5 py-2 text-[11px] font-semibold"
        >
          {t("reports.generating")}
        </button>
      )}

      {cardState.state === "failed" && (
        <button
          type="button"
          onClick={onBuy}
          className="shrink-0 rounded-xl border border-red-500/30 text-red-400 px-4 py-2.5 text-xs font-bold"
        >
          {t("reports.retry")}
        </button>
      )}
    </Card>
  );
}
