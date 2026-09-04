"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { ChevronRight, ThumbsUp } from "lucide-react";
import Card from "@/components/ui/Card";
import { formatRupees, formatCount } from "@/lib/format";
import { getReportTheme, type ReportHue } from "@/lib/report-theme";
import {
  deriveOneTimeCardState,
  monthlyCardState,
  yearlyCardState,
  currentMonthKey,
  formatMonthName,
  formatDateKey,
  type YearlyCardState,
} from "@/lib/reports-logic";
import type { ReportCatalogueEntry } from "@/lib/reports-api";
import { HUE_GRADIENT } from "./ReportThemeCard";
import DiscountPrice from "./DiscountPrice";
import NewBadge from "@/components/ui/NewBadge";

interface ReportCardProps {
  entry: ReportCatalogueEntry;
  /** Not yet turned on by admin (catalogue's own `enabled`, or its `reports.<key>` toggle) — renders a plain non-tappable "Coming Soon" row instead of the normal price/CTA card. */
  comingSoon?: boolean;
  /** Opens the purchase drawer for this report — used for the initial Buy AND the Retry CTA (a retry re-opens the same purchase flow, matching this app's other paid-feature retry UX). */
  onBuy: () => void;
  /** Monthly reports only — opens the drawer in month-picker mode. */
  onAddMonths?: () => void;
  /** Real "N generated" count for this report key, from reportsApi.stats() — omitted/undefined
   * while stats are still loading, in which case the social-proof line renders nothing (never a
   * fake placeholder, same discipline as ReportPurchaseDrawer's identical prop). One-time cards only. */
  generatedCount?: number;
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
export default function ReportCard({ entry, comingSoon, onBuy, onAddMonths, generatedCount }: ReportCardProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const label = t(`reports.labels.${entry.key}`, entry.label);
  const theme = getReportTheme(entry.key);
  const Icon = theme.icon;

  if (comingSoon) {
    return (
      <Card className="p-4 flex items-center gap-3 opacity-60">
        <ReportRowVisual reportKey={entry.key} hue={theme.hue} Icon={Icon} />
        <p className="text-sm font-semibold text-foreground line-clamp-2 break-words flex-1 min-w-0">{label}</p>
        <span className="shrink-0 rounded-full border border-border text-muted px-3 py-1.5 text-[10px] font-semibold whitespace-nowrap">
          {t("reports.comingSoon")}
        </span>
      </Card>
    );
  }

  if (entry.isMonthly) {
    const monthState = monthlyCardState(entry.purchases);
    const month = formatMonthName(currentMonthKey());
    return (
      <Card className="p-4 relative">
        {entry.isNew && <NewBadge className="absolute top-2 right-2 z-10" />}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <ReportRowVisual reportKey={entry.key} hue={theme.hue} Icon={Icon} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground line-clamp-2 break-words">{label}</p>
              <DiscountPrice
                pricePaise={entry.pricePaise}
                originalPricePaise={entry.originalPricePaise}
                priceLabel={formatRupees(entry.pricePaise)}
              />
            </div>
          </div>

          {monthState.state === "ready" ? (
            <button
              type="button"
              onClick={() => router.push(`/reports/${monthState.purchaseId}`)}
              className="shrink-0 rounded-xl border border-gold/30 text-gold px-3.5 py-2.5 text-xs font-bold"
            >
              {t("reports.viewReport")}
            </button>
          ) : monthState.state === "generating" ? (
            <button
              type="button"
              onClick={() => router.push(`/reports/${monthState.purchaseId}`)}
              className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 px-3.5 py-2 text-[11px] font-semibold"
            >
              {t("reports.generating")}
            </button>
          ) : (
            <button
              type="button"
              onClick={onAddMonths}
              className="shrink-0 rounded-xl bg-gold text-[#1a0e00] px-3.5 py-2.5 text-xs font-bold"
            >
              {monthState.state === "failed" ? t("reports.retry") : t("reports.buyForMonth", { month })}
            </button>
          )}
        </div>
      </Card>
    );
  }

  // Yearly reports (marriage/wealth/true_love/numerology — see ReportCatalogueEntry.isYearly's
  // doc comment) use the rolling-year scoping so an expired purchase correctly falls back to a
  // renewable "none" state instead of showing "View Report" forever.
  const cardState: YearlyCardState = entry.isYearly
    ? yearlyCardState(entry.purchases)
    : deriveOneTimeCardState(entry.purchases);
  // A "none" state with prior purchase history means the last one expired — the CTA should
  // read "Renew", not "Buy", since the reader has bought this report before.
  const isRenewal = entry.isYearly && cardState.state === "none" && entry.purchases.length > 0;
  // Static per-report marketing copy (not live chart personalization — see
  // i18n/resources.ts's reports.descriptions/taglines doc comment). Falls back to
  // nothing for a catalogue key this client build doesn't have copy for yet, same
  // fail-open convention as ReportPurchaseDrawer's `covers`.
  const description = t(`reports.descriptions.${entry.key}`, "");
  const tagline = t(`reports.taglines.${entry.key}`, "");
  const hasGeneratedCount = typeof generatedCount === "number" && Number.isFinite(generatedCount) && generatedCount > 0;

  return (
    <Card className="p-4 flex flex-col gap-3 relative">
      {entry.isNew && <NewBadge className="absolute top-2 right-2 z-10" />}
      <div className="flex items-start gap-3">
        <ReportRowVisual reportKey={entry.key} hue={theme.hue} Icon={Icon} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-foreground line-clamp-2 break-words">{label}</p>
            {cardState.state === "none" && <ChevronRight size={16} className="shrink-0 mt-0.5 text-muted" />}
          </div>

          <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-1">
            <span className="text-[10px] font-medium text-muted border border-border rounded-full px-2 py-0.5">
              {t("reports.tabOneTime")}
            </span>
            {cardState.validUntil && (
              <span className="text-[10px] font-medium text-gold border border-gold/25 rounded-full px-2 py-0.5">
                {t("reports.validTill", { date: formatDateKey(cardState.validUntil) })}
              </span>
            )}
            {hasGeneratedCount && (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted">
                <ThumbsUp size={10} />
                {t("reports.statsCount", { count: formatCount(generatedCount) })}
              </span>
            )}
          </div>

          {description && <p className="text-xs text-muted mt-1.5 leading-relaxed">{description}</p>}

          <div className="flex items-center justify-between gap-3 mt-2">
            <DiscountPrice
              pricePaise={entry.pricePaise}
              originalPricePaise={entry.originalPricePaise}
              priceLabel={formatRupees(entry.pricePaise)}
            />

            {cardState.state === "none" && (
              <button
                type="button"
                onClick={onBuy}
                className="shrink-0 rounded-xl bg-gold text-[#1a0e00] px-4 py-2.5 text-xs font-bold"
              >
                {t(isRenewal ? "reports.renew" : "reports.buy")}
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
          </div>
        </div>
      </div>

      {tagline && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" aria-hidden="true" />
          <p className="text-[11px] text-emerald-400 leading-snug">{tagline}</p>
        </div>
      )}
    </Card>
  );
}
