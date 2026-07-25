"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import ReportThemeCard from "@/components/reports/ReportThemeCard";
import ReportPurchaseDrawer from "@/components/reports/ReportPurchaseDrawer";
import { useReportCatalogue } from "@/hooks/useReportCatalogue";
import { useFeature, resolveFeature } from "@/hooks/useFeature";
import { useAuth } from "@/providers/auth-provider";
import { filterVisibleReports } from "@/lib/reports-logic";
import type { ReportCatalogueEntry, PurchaseReportResultRow } from "@/lib/reports-api";

/** Sized for ReportThemeCard's fixed 160px card — a distinct shape from HoroscopeSlider's SkeletonCard (gradient header band + stacked text/CTA), not a reuse of it. */
function SkeletonThemeCard() {
  return (
    <Card className="min-w-[160px] max-w-[160px] p-0 flex-shrink-0 overflow-hidden border-gold/10 animate-pulse">
      <div className="h-16 w-full bg-gold/10 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full bg-gold/15" />
      </div>
      <div className="p-3 flex flex-col gap-2">
        <div className="h-3 w-full rounded bg-gold/10" />
        <div className="h-3 w-2/3 rounded bg-gold/10" />
        <div className="h-2 w-1/2 rounded bg-gold/5" />
        <div className="h-8 w-full rounded-xl bg-gold/10 mt-1" />
      </div>
    </Card>
  );
}

/**
 * Home-only Reports section content — mirrors HoroscopeSlider.tsx's own
 * pattern of hardcoding its own feature flag rather than taking it as a
 * prop, since this component only ever renders from Home
 * (app/page.tsx's ReportsSliderSection). Reuses the exact catalogue/purchase
 * plumbing already live on /reports (useReportCatalogue,
 * ReportPurchaseDrawer, filterVisibleReports) unchanged — this is a new
 * presentation layer, not a new data path.
 */
export default function ReportsSlider() {
  const router = useRouter();
  const { user } = useAuth();
  const { enabled } = useFeature("home.reportsSection");
  const { reports, loading, refetch } = useReportCatalogue(enabled);
  const [purchasingEntry, setPurchasingEntry] = useState<ReportCatalogueEntry | null>(null);

  const visible = reports
    ? filterVisibleReports(reports, (key) => resolveFeature(user?.features, key).enabled)
    : null;

  const handlePurchased = (rows: PurchaseReportResultRow[]) => {
    setPurchasingEntry(null);
    refetch();
    // Same convention as app/reports/page.tsx's handlePurchased: a
    // single-row purchase (any one-time report, or Kundli Milan) has one
    // natural place to land; a monthly bundle purchase returns one row per
    // month, so there's no single id to navigate to — stay on Home, where
    // refetch() above updates the purchased card's state in place.
    if (rows.length === 1) {
      router.push(`/reports/${rows[0].id}`);
    }
  };

  if (!enabled) return null;

  if (loading && !visible) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide pr-5">
        {[...Array(4)].map((_, i) => (
          <SkeletonThemeCard key={i} />
        ))}
      </div>
    );
  }

  // No error UI here (unlike the dedicated /reports page) — a Home teaser
  // section simply omits itself on a failed fetch rather than showing an
  // error message inline below the horoscope slider.
  if (!visible || visible.length === 0) return null;

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide pr-5">
        {visible.map((entry, index) => (
          <ReportThemeCard
            key={entry.key}
            entry={entry}
            index={index}
            onBuy={() => setPurchasingEntry(entry)}
            onAddMonths={() => setPurchasingEntry(entry)}
          />
        ))}
      </div>

      {purchasingEntry && (
        <ReportPurchaseDrawer
          entry={purchasingEntry}
          onClose={() => setPurchasingEntry(null)}
          onPurchased={handlePurchased}
        />
      )}
    </>
  );
}
