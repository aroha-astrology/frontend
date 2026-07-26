"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import { formatRupees } from "@/lib/format";
import { getReportTheme, type ReportHue } from "@/lib/report-theme";
import { deriveOneTimeCardState, purchasedMonthChips, formatPeriodMonth } from "@/lib/reports-logic";
import type { ReportCatalogueEntry } from "@/lib/reports-api";
import { HUE_GRADIENT } from "./ReportThemeCard";
import DiscountPrice from "./DiscountPrice";

interface ReportCardProps {
  entry: ReportCatalogueEntry;
  /** Opens the purchase drawer for this report — used for the initial Buy AND the Retry CTA (a retry re-opens the same purchase flow, matching this app's other paid-feature retry UX). */
  onBuy: () => void;
  /** Monthly reports only — opens the drawer in month-picker mode. */
  onAddMonths?: () => void;
}

/**
 * Small leading visual for a catalogue list row — the illustration at
 * /reports/<key>.png when it loads, falling back to the same icon-badge-on-
 * gradient-wash treatment used by ReportThemeCard's `ReportVisual` (shrunk to
 * list-row scale) so the two surfaces read as one system. Same imgError
 * either/or pattern as GemstoneCard.tsx's `GemVisual`.
 */
function ReportRowVisual({ reportKey, hue, Icon }: { reportKey: string; hue: ReportHue; Icon: LucideIcon }) {
  const [imgError, setImgError] = useState(false);
  if (!imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/reports/${reportKey}.png`}
        alt=""
        width={44}
        height={44}
        onError={() => setImgError(true)}
        className="shrink-0 w-11 h-11 rounded-xl object-cover"
      />
    );
  }
  return (
    <div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br ${HUE_GRADIENT[hue]}`}>
      <div className="w-8 h-8 rounded-full border border-gold/40 bg-background/30 backdrop-blur-sm flex items-center justify-center text-gold">
        <Icon size={16} />
      </div>
    </div>
  );
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
  const theme = getReportTheme(entry.key);
  const Icon = theme.icon;

  if (entry.isMonthly) {
    const chips = purchasedMonthChips(entry.purchases);
    return (
      <Card className="p-4 flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <ReportRowVisual reportKey={entry.key} hue={theme.hue} Icon={Icon} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{label}</p>
              <DiscountPrice
                pricePaise={entry.pricePaise}
                originalPricePaise={entry.originalPricePaise}
                priceLabel={t("reports.perMonth", { price: formatRupees(entry.pricePaise) })}
              />
            </div>
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
      <div className="flex items-center gap-3 min-w-0">
        <ReportRowVisual reportKey={entry.key} hue={theme.hue} Icon={Icon} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{label}</p>
          <DiscountPrice
            pricePaise={entry.pricePaise}
            originalPricePaise={entry.originalPricePaise}
            priceLabel={formatRupees(entry.pricePaise)}
          />
        </div>
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
