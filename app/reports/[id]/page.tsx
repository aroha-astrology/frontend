"use client";

import { useEffect, useLayoutEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import ReportGeneratingSheet from "@/components/reports/ReportGeneratingSheet";
import IconButton from "@/components/ui/IconButton";
import ReportScoreFacts from "@/components/reports/ReportScoreFacts";
import ReportHeaderCard from "@/components/reports/ReportHeaderCard";
import ReportVerdictCard from "@/components/reports/ReportVerdictCard";
import Callout from "@/components/reports/blocks/Callout";
import Checklist from "@/components/reports/blocks/Checklist";
import NameSuggestionCard from "@/components/reports/NameSuggestionCard";
import ReportHero from "@/components/reports/ReportHero";
import KundliMilanReportView from "@/components/reports/kundli-milan/KundliMilanReportView";
import MarriageReportView from "@/components/reports/marriage/MarriageReportView";
import { useReport, type ReportReady } from "@/hooks/useReport";
import { humanizeKey, isReportHeader, isReportVerdict } from "@/lib/report-score-facts";
import { formatPeriodMonth } from "@/lib/reports-logic";
import { maybeRequestReview, markReportGeneratedForReview } from "@/lib/app-review";

/** `id`-namespaced section headings are flat (`reports.sectionHeading.<id>`) for every report
 * type except match_report, whose ids (life-area names like "wealth"/"health") are ambiguous
 * without the report-key namespace (see config/report-sections.ts on the backend). Falls back to
 * the section's own stored `heading` (i18next's `defaultValue`) when there's no `id` at all —
 * a legacy report generated before this feature shipped, or a section-count mismatch (see
 * assignSectionIds's own doc comment) — so an old report keeps rendering exactly as it always did. */
function sectionHeadingKey(reportKey: string, id: string): string {
  return reportKey === "match_report" ? `reports.sectionHeading.match_report.${id}` : `reports.sectionHeading.${id}`;
}

type ReportSection = ReportReady["sections"][number];

/**
 * The reading view for a single purchased report. No profile switcher here —
 * the `id` in the URL already pins a specific profile's report; if the
 * active profile changes mid-view that's fine, per spec, no special handling
 * needed. Page shell (`px-5 pt-4 max-w-lg mx-auto space-y-4`) matches
 * app/kundli/page.tsx's established convention.
 */
export default function ReportDetailPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { state, data, failedError, retry } = useReport(id, i18n.language);

  // The "writing your report…" wait can run up to POLL_TIMEOUT_MS (200s) — long enough that a
  // user idly scrolls the page while it's essentially empty. PageTransition only resets scroll
  // on a PATHNAME change, not on this in-place generating->ready state flip, so without this the
  // page can stay scrolled to that old (now-blank) offset once the much taller ready content
  // renders, showing blank space above content that's really further down the page. Must run
  // in useLayoutEffect (before paint), not useEffect, or the tall content briefly paints at the
  // stale offset first and then jumps.
  useLayoutEffect(() => {
    if (state === "ready" && data) window.scrollTo(0, 0);
  }, [state, data]);

  // A finished report is a milestone worth offering Google's review card on, and
  // the trigger for our own rating sheet — the latter deliberately delayed so it
  // asks after they've read this, not over it. Plain useEffect, not layout: this
  // must never sit between the state flip and paint.
  useEffect(() => {
    if (state !== "ready" || !data) return;
    void maybeRequestReview();
    markReportGeneratedForReview();
  }, [state, data]);

  const title =
    state === "ready" && data
      ? t(`reports.labels.${data.reportKey}`, humanizeKey(data.reportKey))
      : t("reports.view.title");

  const resolveHeading = (s: ReportSection): string =>
    s.id
      ? t(sectionHeadingKey(data?.reportKey ?? "", s.id), { defaultValue: s.heading })
      : s.heading;

  const renderSection = (s: ReportSection, i: number) => {
    // Variant items carry `note` (the exact spelling edit) — ranked suggestion items don't. Only
    // the former needs `currentName` (for the before/after highlight); only the latter gets a
    // rank badge. See NameSuggestionCard's own doc comment.
    const isVariantItems = Boolean(s.items?.[0]?.note);
    const currentName =
      typeof (data?.scores as Record<string, unknown> | undefined)?.currentName === "string"
        ? ((data?.scores as Record<string, unknown>).currentName as string)
        : undefined;

    return (
      <section key={i}>
        <h2 className="font-display text-base text-gold mb-2">{resolveHeading(s)}</h2>
        <div className="space-y-2.5">
          {s.paragraphs.map((p, j) => (
            <p key={j} className="text-sm text-foreground/85 leading-relaxed">
              {p}
            </p>
          ))}
        </div>
        {s.bullets && s.bullets.length > 0 && <Checklist items={s.bullets} className="mt-2.5" />}
        {s.items && s.items.length > 0 && (
          <div className="mt-3 flex flex-col gap-3">
            {s.items.map((item, j) => (
              <NameSuggestionCard
                key={j}
                item={item}
                rank={isVariantItems ? undefined : j + 1}
                currentName={isVariantItems ? currentName : undefined}
              />
            ))}
          </div>
        )}
      </section>
    );
  };

  // Two report types have bespoke, fully designed screens (see each View's doc comment);
  // every other type renders through the generic path below. Kept as two explicit flags
  // rather than a reportKey -> screen registry: at two entries a table would be indirection
  // for its own sake, and the third one can introduce it if it ever earns its keep.
  const isMarriage = state === "ready" && data?.reportKey === "marriage";
  const isKundliMilan = state === "ready" && data?.reportKey === "kundli_milan";
  const isDesigned = isMarriage || isKundliMilan;

  return (
    <main className="min-h-screen pb-tab-safe" style={{ background: "var(--background)" }}>
      <div className="px-5 pt-4 max-w-lg mx-auto space-y-4">
        {isDesigned ? (
          <ReportHero
            title={title}
            onBack={() => router.back()}
            artSrc={isMarriage ? "/marriage/couple.png" : "/kundli-milan/charts.png"}
            subtitleKey={isMarriage ? "marriageReport.subtitle" : "kundliMilanReport.subtitle"}
          />
        ) : (
          <div className="flex items-center gap-3">
            <IconButton onClick={() => router.back()} aria-label={t("common.back")}>
              <ArrowLeft size={18} />
            </IconButton>
            <h1 className="text-lg font-display text-foreground flex-1 truncate">{title}</h1>
          </div>
        )}

        {(state === "idle" || state === "loading" || state === "generating" || (state === "ready" && !data)) && (
          <ReportGeneratingSheet onClose={() => router.push("/reports")} />
        )}

        {state === "failed" && (
          <div className="flex flex-col items-center text-center gap-3 py-16">
            <AlertTriangle size={28} className="text-red-400" />
            <p className="text-sm font-semibold text-foreground">{t("reports.view.failedTitle")}</p>
            <p className="text-xs text-muted max-w-xs">{t("reports.view.failedBody")}</p>
            <Link href="/reports" className="mt-2 text-sm font-semibold text-gold underline underline-offset-4">
              {t("reports.view.tryAgain")}
            </Link>
          </div>
        )}

        {state === "error" && (
          <div className="flex flex-col items-center text-center gap-3 py-16">
            <AlertTriangle size={28} className="text-red-400" />
            <p className="text-sm font-semibold text-foreground">{t("reports.view.failedTitle")}</p>
            <p className="text-xs text-muted max-w-xs">{t("reports.view.failedBody")}</p>
            <button
              onClick={retry}
              className="mt-2 text-sm font-semibold text-gold underline underline-offset-4"
            >
              {t("reports.view.checkAgain")}
            </button>
          </div>
        )}

        {state === "ready" && data && isMarriage && <MarriageReportView data={data} />}

        {state === "ready" && data && isKundliMilan && <KundliMilanReportView data={data} />}

        {state === "ready" && data && !isDesigned && (
          <>
            {data.periodMonth && <p className="text-sm text-muted -mt-1">{formatPeriodMonth(data.periodMonth)}</p>}

            {isReportHeader(data.scores.header) && <ReportHeaderCard header={data.scores.header} />}

            {isReportVerdict(data.scores.verdict) && (
              <Callout eyebrow={t("reports.atAGlance.eyebrow")}>{data.scores.verdict.headline}</Callout>
            )}

            {data.sections.length > 1 && (
              <section className="rounded-2xl border border-gold/15 bg-card p-3.5">
                <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
                  {t("reports.coversTitle")}
                </h2>
                <ol className="space-y-1">
                  {data.sections.map((s, i) => (
                    <li key={i} className="text-xs text-foreground/80">
                      {i + 1}. {resolveHeading(s)}
                    </li>
                  ))}
                </ol>
              </section>
            )}

            <ReportScoreFacts scores={data.scores} />

            <div className="space-y-6">{data.sections.map(renderSection)}</div>

            {isReportVerdict(data.scores.verdict) && <ReportVerdictCard verdict={data.scores.verdict} />}
          </>
        )}
      </div>
    </main>
  );
}
