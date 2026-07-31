"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import SectionTitle from "@/components/SectionTitle";
import ProfileSwitchTrigger from "@/components/ui/ProfileSwitchTrigger";
import SegmentedToggle from "@/components/ui/SegmentedToggle";
import FeatureGuard from "@/components/FeatureGuard";
import ReportCard from "@/components/reports/ReportCard";
import ReportPurchaseDrawer from "@/components/reports/ReportPurchaseDrawer";
import GemstoneCard from "@/components/ui/GemstoneCard";
import { useReportCatalogue } from "@/hooks/useReportCatalogue";
import { useReportStats } from "@/hooks/useReportStats";
import { useFeature, resolveFeature } from "@/hooks/useFeature";
import { useAuth } from "@/providers/auth-provider";
import { splitReportsByType, filterVisibleReports } from "@/lib/reports-logic";
import type { ReportCatalogueEntry, PurchaseReportResultRow } from "@/lib/reports-api";

type Tab = "oneTime" | "monthly";

function ReportsCatalogue() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  // Same gate FeatureGuard already enforces at the route level, applied again
  // at the fetch itself — matches every other feature-gated hook's convention
  // (see hooks/useKundli.ts's `enabled` param). Reports no longer has its own
  // 'nav.reports' tab (the whole route is reached via Home's "See All" or a
  // direct link now), so this is gated on the Home section's own flag,
  // 'home.reportsSection', instead — the same key FeatureGuard below checks.
  const { enabled: reportsSectionEnabled } = useFeature("home.reportsSection");
  const { reports, loading, error, refetch } = useReportCatalogue(reportsSectionEnabled);
  // Fetched once here (not per-card) and threaded down to the purchase
  // drawer — see hooks/useReportStats.ts's doc comment for why this is a
  // single shared fetch rather than N per-card calls.
  const { stats } = useReportStats();
  const [tab, setTab] = useState<Tab>("oneTime");
  const [purchasingEntry, setPurchasingEntry] = useState<ReportCatalogueEntry | null>(null);

  const { oneTime, monthly } = useMemo(() => {
    if (!reports) return { oneTime: [] as ReportCatalogueEntry[], monthly: [] as ReportCatalogueEntry[] };
    // The catalogue's own `enabled` is the source of truth once fetched, but
    // each card is ALSO gated by its own `reports.<key>` admin toggle.
    const visible = filterVisibleReports(reports, (key) => resolveFeature(user?.features, key).enabled);
    return splitReportsByType(visible);
  }, [reports, user?.features]);

  const activeList = tab === "oneTime" ? oneTime : monthly;

  const handlePurchased = (rows: PurchaseReportResultRow[]) => {
    setPurchasingEntry(null);
    refetch();
    // A single-row purchase (any one-time report, or Kundli Milan) has one
    // natural place to land; a monthly bundle purchase returns one row per
    // month, so there's no single id to navigate to — stay on the catalogue,
    // whose chip list now reflects the new purchases via `refetch()` above.
    if (rows.length === 1) {
      router.push(`/reports/${rows[0].id}`);
    }
  };

  return (
    <main className="min-h-screen pb-tab-safe" style={{ background: "var(--background)" }}>
      <div className="px-5 pt-4">
        <SectionTitle title={t("reports.title")} subtitle={t("reports.subtitle")} />
        <ProfileSwitchTrigger className="mb-4 -mt-2" />

        <SegmentedToggle
          value={tab}
          onChange={setTab}
          options={[
            { value: "oneTime", label: t("reports.tabOneTime") },
            { value: "monthly", label: t("reports.tabMonthly") },
          ]}
          className="mb-4"
        />

        {loading && !reports ? (
          <div className="flex justify-center py-10">
            <Loader2 size={24} className="animate-spin text-gold" />
          </div>
        ) : error && !reports ? (
          <p className="text-xs text-red-400 text-center py-10">{t("reports.loadError")}</p>
        ) : activeList.length === 0 ? (
          <p className="text-xs text-muted text-center py-10">{t("reports.empty")}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {activeList.map((entry) => (
              <ReportCard
                key={entry.key}
                entry={entry}
                onBuy={() => setPurchasingEntry(entry)}
                onAddMonths={() => setPurchasingEntry(entry)}
                generatedCount={stats?.[entry.key]}
              />
            ))}
          </div>
        )}

        {/* Gemstone recommendations — a separate credit-gated unlock, not part of the
            reportsApi catalogue, so it's dropped in verbatim rather than reshaped into a
            ReportCatalogueEntry it doesn't have data for. One-time tab only (there's no
            monthly variant). */}
        {tab === "oneTime" && (
          <div className="mt-4">
            <GemstoneCard />
          </div>
        )}
      </div>

      {purchasingEntry && (
        <ReportPurchaseDrawer
          entry={purchasingEntry}
          onClose={() => setPurchasingEntry(null)}
          onPurchased={handlePurchased}
          generatedCount={stats?.[purchasingEntry.key]}
        />
      )}
    </main>
  );
}

export default function ReportsPage() {
  return (
    <FeatureGuard featureKey="home.reportsSection">
      <ReportsCatalogue />
    </FeatureGuard>
  );
}
