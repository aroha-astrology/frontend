"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { List } from "lucide-react";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import { tick } from "@/lib/haptics";
import type { ReportReady } from "@/hooks/useReport";
import { readVarshik } from "./data";
import PageFrame, { CHAPTER_EN } from "./PageFrame";
import ReportSurface from "./ReportSurface";
import { buildPages } from "./pages";
import { editionNumber } from "./facts-helpers";
import { ReportYearContext } from "./year-context";
import { PdfDownloadButton, PdfStatusLayer } from "@/components/pdf/PdfDownload";
import { ShareCardsButton, ShareCardsSheet } from "./ShareCards";
import { useVarshikPdf } from "./useVarshikPdf";
import VarshikUpgradeCard from "./VarshikUpgradeCard";
import type { PageCtx } from "./page-types";
import { asTierSlug, type VarshikTierSlug } from "./tier-pages";

/**
 * The Varshik Rashifal 2027 report: 56 to 61 pages in plan order, one long scroll like every other report.
 * The contents list and the Timing Map scroll to any page.
 * Everything on the pages is read from the frozen facts (`scores.varshik`) and the checked text.
 */
export default function VarshikReportView({ data, reportId, tier: tierOverride }: { data: ReportReady; reportId?: string; tier?: VarshikTierSlug }) {
  const { t, i18n } = useTranslation();
  const reduce = useReducedMotion();
  const read = useMemo(() => readVarshik(data), [data]);
  const lang = i18n.language;
  // After an upgrade the new tier shows at once; the saved report catches up on the next open.
  const [upgraded, setUpgraded] = useState<VarshikTierSlug | null>(null);
  const tier = tierOverride ?? upgraded ?? asTierSlug(data.tier);
  const pages = useMemo(() => (read ? buildPages(read.facts, read.byId, t, lang, tier) : []), [read, t, lang, tier]);
  const [jump, setJump] = useState(false);
  const [share, setShare] = useState(false);

  // The moment the report is ready: one light tap (Android; a short vibrate in browsers that have it).
  useEffect(() => {
    if (!reduce) void tick(14);
  }, [reduce]);

  const goIndex = useCallback(
    (i: number) => {
      const key = pages[i]?.key;
      if (!key) return;
      document.getElementById(`vk-page-${key}`)?.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
    },
    [pages, reduce],
  );

  const ctx: PageCtx | null = useMemo(() => {
    if (!read) return null;
    return {
      ...read,
      name: read.facts.reader.name,
      edition: reportId ? editionNumber(reportId) : null,
      lang,
      tier,
      pages: pages.map((p) => ({ key: p.key, chapter: p.chapter, title: p.title })),
      go: (key) => {
        const i = pages.findIndex((p) => p.key === key);
        if (i >= 0) goIndex(i);
      },
      goChapter: (chapter) => {
        const i = pages.findIndex((p) => p.chapter === chapter);
        if (i >= 0) goIndex(i);
      },
    };
  }, [read, lang, tier, pages, goIndex, reportId]);

  const pdf = useVarshikPdf({
    pages,
    ctx,
    year: read?.facts.year ?? 2027,
    title: t("varshik.cover.title", { defaultValue: "Your year ahead" }),
  });

  if (!read || !ctx || pages.length === 0) {
    return (
      <p className="vk-body" role="status">
        {t("varshik.error.noFacts", { defaultValue: "This report could not be opened. Please try again in a moment." })}
      </p>
    );
  }

  return (
    <ReportYearContext.Provider value={read.facts.year ?? 2027}>
    <ReportSurface>
      <motion.div
        className="flex min-w-0 flex-col gap-3"
        data-testid="varshik-report"
        initial={{ opacity: reduce ? 1 : 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduce ? 0 : 0.7, ease: "easeOut" }}
      >
        <nav className="flex items-center justify-between gap-2" aria-label={t("varshik.nav.label", { defaultValue: "Report pages" })}>
          <button type="button" onClick={() => setJump(true)} className="vk-panel flex items-center gap-2 px-3 py-2 text-xs" aria-haspopup="dialog">
            <List size={16} aria-hidden="true" style={{ color: "var(--gold)" }} />
            {t("varshik.nav.contents", { defaultValue: "Contents" })}
          </button>
        </nav>

        {pages.map((page, i) => {
          const Body = page.Body;
          return (
            <div
              key={page.key}
              id={`vk-page-${page.key}`}
              className="scroll-mt-24"
              style={{ contentVisibility: "auto", containIntrinsicSize: "auto 720px" }}
            >
              <PageFrame chapter={page.chapter} name={read.facts.reader.name} pageNo={i + 1} total={pages.length} title={page.title} eyebrow={page.eyebrow}>
                <Body ctx={ctx} />
              </PageFrame>
            </div>
          );
        })}

        {reportId && tier !== "complete" ? <VarshikUpgradeCard reportId={reportId} current={tier} onUpgraded={setUpgraded} /> : null}

        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <PdfDownloadButton onClick={pdf.download} />
          <ShareCardsButton onClick={() => setShare(true)} />
        </div>
      </motion.div>
      {pdf.book}
      <PdfStatusLayer status={pdf.status} onDismiss={pdf.dismiss} />

      {share ? (
        <ShareCardsSheet
          year={read.facts.year ?? 2027}
          lang={lang}
          months={read.facts.scores.months.map((m) => ({ tier: m.tier }))}
          peaks={read.facts.scores.peakMonths}
          moonSign={read.facts.birth.planets.find((p) => p.planet === "Moon")?.sign}
          lagna={read.facts.birth.lagna.sign}
          onClose={() => setShare(false)}
        />
      ) : null}

      {jump ? (
        <BottomSheetModal onClose={() => setJump(false)} closeLabel={t("common.close")} header={<div />}>
          <div className="vk-surface flex max-h-[70vh] min-w-0 flex-col gap-4 overflow-y-auto py-1">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((chapter) => {
              const own = pages.map((p, i) => ({ p, i })).filter(({ p }) => p.chapter === chapter && p.title);
              if (own.length === 0) return null;
              return (
                <section key={chapter} className="flex min-w-0 flex-col gap-1.5">
                  <h3 className="vk-eyebrow m-0">{t(`varshik.chapter.${chapter}`, { defaultValue: CHAPTER_EN[chapter] })}</h3>
                  <ul className="m-0 flex list-none flex-col gap-1 p-0">
                    {own.map(({ p, i }) => (
                      <li key={p.key}>
                        <button
                          type="button"
                          onClick={() => {
                            setJump(false);
                            goIndex(i);
                          }}
                          className="flex w-full min-w-0 items-baseline justify-between gap-3 rounded-lg px-2 py-1.5 text-left text-sm"
                          style={{ color: "var(--foreground)" }}
                        >
                          <span className="min-w-0 break-words leading-[1.45]">{p.title}</span>
                          <span className="vk-caption tabular-nums">{i + 1}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </BottomSheetModal>
      ) : null}
    </ReportSurface>
    </ReportYearContext.Provider>
  );
}
