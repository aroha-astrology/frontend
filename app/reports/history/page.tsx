"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Loader2, FileText, ChevronRight } from "lucide-react";
import IconButton from "@/components/ui/IconButton";
import FeatureGuard from "@/components/FeatureGuard";
import { reportsApi, type ReportHistoryEntry } from "@/lib/reports-api";

/** "This Month" / "Last Month" / "MMMM YYYY" — fixed-locale date formatting, matching this app's
 * existing convention for non-translated date strings (see TimingWindowsCard.tsx's formatWindowDate). */
function monthBucketLabel(iso: string, t: (key: string) => string): string {
  const date = new Date(iso);
  const now = new Date();
  const sameMonth = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
  if (sameMonth(date, now)) return t("reports.history.thisMonth");
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  if (sameMonth(date, lastMonth)) return t("reports.history.lastMonth");
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function groupByMonth(entries: ReportHistoryEntry[], t: (key: string) => string): [string, ReportHistoryEntry[]][] {
  const groups = new Map<string, ReportHistoryEntry[]>();
  for (const entry of entries) {
    const bucket = monthBucketLabel(entry.createdAt, t);
    const list = groups.get(bucket);
    if (list) list.push(entry);
    else groups.set(bucket, [entry]);
  }
  return Array.from(groups.entries());
}

export default function ReportHistoryPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [entries, setEntries] = useState<ReportHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportsApi
      .history()
      .then(({ reports }) => setEntries(reports))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  const grouped = useMemo(() => groupByMonth(entries, t), [entries, t]);

  return (
    <FeatureGuard featureKey="home.reportsSection">
      <div className="flex flex-col min-h-[100dvh] bg-background">
        <div className="sticky top-0 z-50 px-5 h-16 flex items-center gap-3 bg-background/80 backdrop-blur-md border-b border-gold/10">
          <IconButton onClick={() => router.back()} className="-ml-2">
            <ArrowLeft />
          </IconButton>
          <h1 className="text-xl font-display font-semibold text-foreground">{t("reports.history.title")}</h1>
        </div>

        <div className="flex-1 p-5 max-w-lg mx-auto w-full flex flex-col gap-6">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-gold/40 animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gold/5 flex items-center justify-center">
                <FileText className="w-8 h-8 text-gold/40" />
              </div>
              <div>
                <h2 className="text-lg font-medium text-foreground mb-1">{t("reports.history.empty")}</h2>
                <p className="text-sm text-muted">{t("reports.history.emptyDesc")}</p>
              </div>
            </div>
          ) : (
            grouped.map(([bucket, rows]) => (
              <div key={bucket} className="flex flex-col gap-3">
                <p className="text-[11px] uppercase tracking-wider text-muted px-1">{bucket}</p>
                <div className="flex flex-col gap-3">
                  {rows.map((entry) => {
                    const ready = entry.status === "ready";
                    return (
                      <button
                        key={entry.id}
                        disabled={!ready}
                        onClick={() => ready && router.push(`/reports/${entry.id}`)}
                        className="p-4 rounded-2xl bg-surface border border-gold/10 flex items-center gap-4 text-left disabled:opacity-60"
                      >
                        <div className="w-10 h-10 rounded-full bg-gold/10 text-gold flex items-center justify-center shrink-0">
                          <FileText size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground font-medium text-sm truncate">{entry.label}</p>
                          <p className="text-muted text-xs mt-0.5">
                            {new Date(entry.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>
                        {entry.status === "generating" && (
                          <span className="text-[11px] font-medium text-amber-400 shrink-0">{t("reports.history.statusGenerating")}</span>
                        )}
                        {entry.status === "failed" && (
                          <span className="text-[11px] font-medium text-red-400 shrink-0">{t("reports.history.statusFailed")}</span>
                        )}
                        {ready && <ChevronRight size={16} className="text-muted shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </FeatureGuard>
  );
}
