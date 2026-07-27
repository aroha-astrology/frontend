"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import GeneratingSpinner from "@/components/ui/GeneratingSpinner";
import IconButton from "@/components/ui/IconButton";
import ReportScoreFacts from "@/components/reports/ReportScoreFacts";
import { useReport, type ReportReady } from "@/hooks/useReport";
import { useReportCatalogue } from "@/hooks/useReportCatalogue";
import { useAuth } from "@/providers/auth-provider";
import { humanizeKey } from "@/lib/report-score-facts";
import { formatPeriodMonth, splitPreviewSections } from "@/lib/reports-logic";
import { formatRupees } from "@/lib/format";
import { ApiError } from "@/lib/api";
import { reportsApi, type PurchaseReportBody } from "@/lib/reports-api";

type ReportSection = ReportReady["sections"][number];

/**
 * The reading view for a single purchased (or previewed) report. No profile
 * switcher here — the `id` in the URL already pins a specific profile's
 * report; if the active profile changes mid-view that's fine, per spec, no
 * special handling needed. Page shell (`px-5 pt-4 max-w-lg mx-auto space-y-4`)
 * matches app/kundli/page.tsx's established convention.
 *
 * `data.isPreview` (see lib/reports-api.ts) branches the ready view: a real
 * purchase (including one upgraded FROM a preview — same row, `isPreview`
 * just flips to false server-side) shows every section normally, exactly as
 * before. A still-unpurchased preview instead shows only the first
 * section/chapter clearly (`splitPreviewSections`) and blurs every section
 * after it, with an inline unlock CTA overlaid on the blurred area — a
 * lightweight purchase flow built directly here (not the full
 * ReportPurchaseDrawer) so it never has to reason about `entry.purchases`
 * already containing this very preview row (which would otherwise make a
 * monthly report look "already purchased" and hide the Buy button).
 */
export default function ReportDetailPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { state, data, failedError, retry } = useReport(id, i18n.language);
  const { user, activeProfile, refresh } = useAuth();
  // Only needed for this report's price/discount display in the unlock CTA —
  // the full catalogue (with its per-key `purchases` history) is otherwise
  // irrelevant to this page, see the doc comment above for why the unlock
  // flow is NOT built on top of ReportPurchaseDrawer/that catalogue state.
  const { reports: catalogue } = useReportCatalogue();

  const title =
    state === "ready" && data
      ? t(`reports.labels.${data.reportKey}`, humanizeKey(data.reportKey))
      : t("reports.view.title");

  const catalogueEntry = useMemo(
    () => (data ? (catalogue?.find((r) => r.key === data.reportKey) ?? null) : null),
    [catalogue, data],
  );

  const { visible, blurred } = useMemo(
    () => (data ? splitPreviewSections(data.sections, data.isPreview) : { visible: [] as ReportSection[], blurred: [] as ReportSection[] }),
    [data],
  );

  // ── Inline unlock (upgrade a preview into a real purchase) ───────────────
  const costPaise = catalogueEntry?.pricePaise ?? 0;
  const balancePaise = user?.walletBalancePaise ?? 0;
  const insufficient = balancePaise < costPaise;
  const [confirmingUnlock, setConfirmingUnlock] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  const handleUnlock = async () => {
    if (!data) return;
    setUnlockError(null);
    setUnlocking(true);
    try {
      const body: PurchaseReportBody = { reportKey: data.reportKey };
      if (activeProfile && activeProfile.id !== "primary") body.birthProfileId = activeProfile.id;
      if (data.periodMonth) body.months = [data.periodMonth];
      await reportsApi.purchase(body);
      await refresh();
      setConfirmingUnlock(false);
      // The purchase upgrades the SAME row server-side — re-fetch this id
      // rather than navigate, so the very next poll comes back `isPreview:
      // false` with every section already generated (no second wait).
      retry();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setUnlockError(t("reports.purchase.notEnough", { cost: formatRupees(costPaise), amount: formatRupees(balancePaise) }));
      } else {
        setUnlockError(t("reports.purchase.unlockError"));
      }
    } finally {
      setUnlocking(false);
    }
  };

  const renderSection = (s: ReportSection, i: number) => (
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
  );

  return (
    <main className="min-h-screen pb-tab-safe" style={{ background: "var(--background)" }}>
      <div className="px-5 pt-4 max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <IconButton onClick={() => router.back()} aria-label={t("common.back")}>
            <ArrowLeft size={18} />
          </IconButton>
          <h1 className="text-lg font-display text-foreground flex-1 truncate">{title}</h1>
          {state === "ready" && data?.isPreview && (
            <span className="shrink-0 rounded-full border border-gold/30 text-gold px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
              {t("reports.view.previewBadge")}
            </span>
          )}
        </div>

        {(state === "idle" || state === "loading" || state === "generating") && (
          <>
            <GeneratingSpinner label={t("reports.view.generatingTitle")} size={40} className="py-16" />
            <p className="text-xs text-muted text-center -mt-2">{t("reports.view.generatingBody")}</p>
          </>
        )}

        {state === "failed" && (
          <div className="flex flex-col items-center text-center gap-3 py-16">
            <AlertTriangle size={28} className="text-red-400" />
            <p className="text-sm font-semibold text-foreground">{t("reports.view.failedTitle")}</p>
            <p className="text-xs text-muted max-w-xs">{failedError ?? t("reports.view.failedBody")}</p>
            <Link href="/reports" className="mt-2 text-sm font-semibold text-gold underline underline-offset-4">
              {t("reports.view.tryAgain")}
            </Link>
          </div>
        )}

        {state === "error" && (
          <div className="flex flex-col items-center text-center gap-3 py-16">
            <AlertTriangle size={28} className="text-red-400" />
            <p className="text-sm font-semibold text-foreground">{t("reports.view.failedTitle")}</p>
            <p className="text-xs text-muted max-w-xs">{failedError ?? t("reports.view.failedBody")}</p>
            <button
              onClick={retry}
              className="mt-2 text-sm font-semibold text-gold underline underline-offset-4"
            >
              {t("reports.view.checkAgain")}
            </button>
          </div>
        )}

        {state === "ready" && data && (
          <>
            {data.periodMonth && <p className="text-sm text-muted -mt-1">{formatPeriodMonth(data.periodMonth)}</p>}

            <ReportScoreFacts scores={data.scores} />

            <div className="space-y-6">{visible.map(renderSection)}</div>

            {blurred.length > 0 && (
              <div className="relative rounded-2xl overflow-hidden">
                <div className="space-y-6 blur-sm select-none pointer-events-none" aria-hidden="true">
                  {blurred.map(renderSection)}
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-end gap-2.5 p-5 text-center bg-gradient-to-t from-background via-background/95 to-transparent">
                  <p className="text-sm font-semibold text-foreground">{t("reports.view.previewLockedTitle")}</p>
                  <p className="text-xs text-muted max-w-[240px]">{t("reports.view.previewLockedBody")}</p>

                  {insufficient ? (
                    <>
                      <p className="text-[11px] text-amber-400">
                        {t("reports.purchase.notEnough", { cost: formatRupees(costPaise), amount: formatRupees(balancePaise) })}
                      </p>
                      <Link
                        href="/payment"
                        className="rounded-2xl bg-gold text-[#1a0e00] px-5 py-3 text-sm font-bold"
                      >
                        {t("reports.purchase.getCredits")}
                      </Link>
                    </>
                  ) : confirmingUnlock ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmingUnlock(false)}
                        disabled={unlocking}
                        className="rounded-xl border border-gold/20 text-muted px-4 py-2.5 text-sm font-medium disabled:opacity-50"
                      >
                        {t("common.no")}
                      </button>
                      <button
                        type="button"
                        onClick={handleUnlock}
                        disabled={unlocking}
                        className="rounded-xl bg-gold text-[#1a0e00] px-4 py-2.5 text-sm font-bold disabled:opacity-50"
                      >
                        {unlocking ? t("reports.purchase.processing") : t("reports.purchase.confirmYes")}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmingUnlock(true)}
                      disabled={!catalogueEntry}
                      className="rounded-2xl bg-gold text-[#1a0e00] px-5 py-3 text-sm font-bold disabled:opacity-50"
                    >
                      {t("reports.buy")}
                      {catalogueEntry ? ` · ${formatRupees(catalogueEntry.pricePaise)}` : ""}
                    </button>
                  )}

                  {unlockError && <p className="text-[11px] text-red-400">{unlockError}</p>}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
