"use client";

import { useTranslation } from "react-i18next";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import GeneratingSpinner from "@/components/ui/GeneratingSpinner";
import ReportScoreFacts from "@/components/reports/ReportScoreFacts";
import { useReport } from "@/hooks/useReport";
import { humanizeKey } from "@/lib/report-score-facts";
import { formatPeriodMonth } from "@/lib/reports-logic";

/**
 * The reading view for a single purchased report. No profile switcher here —
 * the `id` in the URL already pins a specific profile's report; if the
 * active profile changes mid-view that's fine, per spec, no special handling
 * needed. Page shell (`px-5 pt-4 max-w-lg mx-auto space-y-4`) matches
 * app/kundli/page.tsx's established convention.
 */
export default function ReportDetailPage() {
  const { t, i18n } = useTranslation();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { state, data, failedError } = useReport(id, i18n.language);

  return (
    <main className="min-h-screen pb-tab-safe" style={{ background: "var(--background)" }}>
      <div className="px-5 pt-4 max-w-lg mx-auto space-y-4">
        {(state === "idle" || state === "loading" || state === "generating") && (
          <>
            <GeneratingSpinner label={t("reports.view.generatingTitle")} size={40} className="py-16" />
            <p className="text-xs text-muted text-center -mt-2">{t("reports.view.generatingBody")}</p>
          </>
        )}

        {(state === "failed" || state === "error") && (
          <div className="flex flex-col items-center text-center gap-3 py-16">
            <AlertTriangle size={28} className="text-red-400" />
            <p className="text-sm font-semibold text-foreground">{t("reports.view.failedTitle")}</p>
            <p className="text-xs text-muted max-w-xs">{failedError ?? t("reports.view.failedBody")}</p>
            <Link href="/reports" className="mt-2 text-sm font-semibold text-gold underline underline-offset-4">
              {t("reports.view.tryAgain")}
            </Link>
          </div>
        )}

        {state === "ready" && data && (
          <>
            <div>
              <h1 className="font-display text-2xl text-gold leading-tight">
                {t(`reports.labels.${data.reportKey}`, humanizeKey(data.reportKey))}
              </h1>
              {data.periodMonth && <p className="text-sm text-muted mt-1">{formatPeriodMonth(data.periodMonth)}</p>}
            </div>

            <ReportScoreFacts scores={data.scores} />

            <div className="space-y-6">
              {data.sections.map((s, i) => (
                <section key={i}>
                  <h2 className="font-display text-base text-gold mb-2">{s.heading}</h2>
                  <div className="space-y-2.5">
                    {s.paragraphs.map((p, j) => (
                      <p key={j} className="text-sm text-foreground/85 leading-relaxed">
                        {p}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
