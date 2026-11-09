"use client";

import { useEffect, useMemo, useState } from "react";
import { switchLanguage } from "@/i18n/switch-language";
import { useTheme } from "next-themes";
import type { ReactNode } from "react";
import { sampleFacts as f } from "@/components/reports/varshik/fixture";
import ScoreRing from "@/components/reports/varshik/ScoreRing";
import AreaBars from "@/components/reports/varshik/AreaBars";
import AreaMonthLine from "@/components/reports/varshik/AreaMonthLine";
import TimingMap from "@/components/reports/varshik/TimingMap";
import MomentumWave from "@/components/reports/varshik/MomentumWave";
import BigMovesGantt from "@/components/reports/varshik/BigMovesGantt";
import VarshaTimeline from "@/components/reports/varshik/VarshaTimeline";
import PanchadhikariTable from "@/components/reports/varshik/PanchadhikariTable";
import PlanetImpactTable from "@/components/reports/varshik/PlanetImpactTable";
import DecisionTable from "@/components/reports/varshik/DecisionTable";
import DoshaTable from "@/components/reports/varshik/DoshaTable";
import YogaList from "@/components/reports/varshik/YogaList";
import SkyCalendar from "@/components/reports/varshik/SkyCalendar";
import ArtSlot from "@/components/reports/varshik/ArtSlot";
import PdfBook, { type PdfBookHandle, type FitReport } from "@/components/reports/varshik/PdfBook";
import { readVarshik } from "@/components/reports/varshik/data";
import { buildPages } from "@/components/reports/varshik/pages";
import { asTierSlug } from "@/components/reports/varshik/tier-pages";
import VarshikTierSheet from "@/components/reports/varshik/VarshikTierSheet";
import VarshikUpgradeCard from "@/components/reports/varshik/VarshikUpgradeCard";
import { ReportYearContext } from "@/components/reports/varshik/year-context";
import type { PageCtx } from "@/components/reports/varshik/page-types";
import { useTranslation } from "react-i18next";
import { useRef } from "react";
import ReportSurface, { ReportSection } from "@/components/reports/varshik/ReportSurface";
import VarshikReportView from "@/components/reports/varshik/VarshikReportView";
import VarshikCover from "@/components/reports/varshik/VarshikCover";
import VarshikWaiting from "@/components/reports/varshik/VarshikWaiting";
import { sampleReport } from "@/components/reports/varshik/fixtures/sample-report";
import liveReport from "@/components/reports/varshik/fixtures/live-report.json";
import { inIndic, withQuestions } from "@/components/reports/varshik/fixtures/variants";
import type { ReportReady } from "@/hooks/useReport";

/** Long Indic sentences for the engine-written text that is not in the bundle (dosha notes), so wrapping is tested at real length. */
const INDIC = {
  hi: { text: "यह अवधि साझेदारी, स्वभाव और ऊर्जा को छूती है, इसलिए शांत रहकर निर्णय लेना अच्छा रहेगा।" },
  ta: { text: "இந்தக் காலம் கூட்டாண்மை, மனநிலை மற்றும் சக்தியைத் தொடுகிறது, எனவே அமைதியாக முடிவெடுப்பது நல்லது." },
} as const;

function Block({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <ReportSection id={id} eyebrow="Varshik Rashifal 2027" title={title} beam={id === "ring"}>
      {children}
    </ReportSection>
  );
}

/** The A4 pages as the PDF draws them, fitted, visible in the flow (?view=book&q=2&lang=hi). Dev only. */
const previewTier = () => asTierSlug(typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("tier"));

function BookPreview({ data }: { data: ReportReady }) {
  const { t, i18n } = useTranslation();
  const book = useRef<PdfBookHandle>(null);
  const read = useMemo(() => readVarshik(data), [data]);
  const lang = i18n.language;
  const tier = previewTier();
  const pages = useMemo(() => (read ? buildPages(read.facts, read.byId, t, lang, tier) : []), [read, t, lang, tier]);
  const ctx: PageCtx | null = useMemo(
    () => (read ? { ...read, name: read.facts.reader.name, edition: "0A1B2C", lang, tier, pages: pages.map((p) => ({ key: p.key, chapter: p.chapter, title: p.title })), go: () => {}, goChapter: () => {} } : null),
    [read, lang, tier, pages],
  );
  useEffect(() => {
    if (!ctx) return;
    void book.current?.fit().then((fits: FitReport[]) => {
      (window as unknown as { __vkFit?: FitReport[] }).__vkFit = fits;
      document.body.dataset.fitted = "1";
    });
  }, [ctx, pages]);
  if (!read || !ctx) return null;
  return (
    <ReportYearContext.Provider value={read.facts.year ?? 2027}>
      <PdfBook ref={book} pages={pages} ctx={ctx} preview />
    </ReportYearContext.Provider>
  );
}

/** DEV ONLY: the owner's accuracy-test report, loaded at run time from the gitignored .claude folder. */
function OwnerView() {
  const [data, setData] = useState<ReportReady | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    fetch("/varshik-preview/owner-data", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<ReportReady>) : Promise.reject(new Error(String(r.status)))))
      .then(setData)
      .catch(() => setMissing(true));
  }, []);
  if (missing) return <main className="p-6">No owner report in frontend/.claude/varshik-owner-report.json.</main>;
  if (!data) return <main className="p-6">Loading…</main>;
  const book = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("book") === "1";
  return book ? <BookPreview data={data} /> : <VarshikReportView tier={previewTier()} data={data} reportId="0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d" />;
}

export default function PreviewClient() {
  const { setTheme, resolvedTheme } = useTheme();
  const lang = typeof window === "undefined" ? "en" : (new URLSearchParams(window.location.search).get("lang") ?? "en");
  // Use the app's own loader, so ?lang=<code> shows the real translations from the bundle and i18n/generated.
  useEffect(() => {
    void switchLanguage(lang);
  }, [lang]);
  const view = typeof window === "undefined" ? "" : (new URLSearchParams(window.location.search).get("view") ?? "");
  const indic = lang === "hi" || lang === "ta" ? INDIC[lang] : null;
  const doshas = useMemo(
    () => (indic ? f.doshas.map((d) => ({ ...d, touches: indic.text, remedy: indic.text })) : f.doshas),
    [indic],
  );
  const v = f.varsha[f.varsha.length - 1];
  const love = f.scores.timingMap.love;
  if (view === "tiers") {
    // The tier picker as the buy flow shows it (?view=tiers). Sample copy; the real text comes from Admin → Varshik Pricing.
    const mk = (tierSlug: "basic" | "gold" | "complete", displayName: string, subtitle: string, badgeText: string | null, pricePaise: number, originalPricePaise: number, pageCount: number, sortOrder: number, features: string[], excludes: string[]) => ({
      tierSlug, displayName, subtitle, badgeText, pricePaise, originalPricePaise, pageCount, shortDescription: "Deep readings for all seven life areas and your exact timing: golden windows, the sky calendar, when to act, plus the answers to the questions you told us about.",
      features, excludes, isPopular: tierSlug === "gold", isActive: true, sortOrder, payPaise: pricePaise,
    });
    const tiers = [
      mk("basic", "Varshik Snapshot", "Essential scores and core charts", null, 29900, 49900, 20, 1, ["20-page personalised report", "Birth chart, birth stars and two Varsha charts", "Seven life-area scores and the 12-month timing map"], ["Detailed life-area readings", "Month-by-month guide"]),
      mk("gold", "Varshik Gold", "Life areas, timing and your questions", "MOST POPULAR", 59900, 99900, 34, 2, ["Everything in Varshik Snapshot", "A full reading for each of the seven life areas", "Golden windows, sky calendar and when to act"], ["Month-by-month guide"]),
      mk("complete", "Varshik Sampoorna", "The complete twelve-month almanac", "BEST VALUE", 99900, 199900, 59, 3, ["Everything in Varshik Gold", "Two pages for every month, January to December"], []),
    ];
    return (
      <ReportSurface page className="min-h-screen">
        <VarshikTierSheet tiers={tiers} onClose={() => {}} onContinue={() => {}} />
        <main className="mx-auto flex max-w-[420px] flex-col gap-4 p-4">
          <VarshikUpgradeCard reportId="0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d" current="basic" onUpgraded={() => {}} />
        </main>
      </ReportSurface>
    );
  }
  if (view === "cover") {
    const names = (typeof window === "undefined" ? "" : (new URLSearchParams(window.location.search).get("names") ?? "")).split("|");
    const a4 = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("a4") === "1";
    return (
      <ReportSurface page className="min-h-screen">
        <main className="mx-auto flex max-w-[420px] flex-col gap-4 p-4">
          {names.map((n) => (
            <VarshikCover key={n} name={n} a4={a4} />
          ))}
        </main>
      </ReportSurface>
    );
  }
  if (view === "wait") {
    const done = typeof window === "undefined" ? 0 : Number(new URLSearchParams(window.location.search).get("done") ?? 0);
    return (
      <ReportSurface page className="min-h-screen">
        <main className="mx-auto max-w-[420px] p-6">
          <VarshikWaiting progress={{ done, total: 6 }} />
        </main>
      </ReportSurface>
    );
  }
  if (view === "book") {
    const sp = new URLSearchParams(window.location.search);
    const q = Math.max(0, Math.min(5, Number(sp.get("q") ?? 2)));
    const base = sp.get("src") === "sample" ? sampleReport : (liveReport as unknown as ReportReady);
    return (
      <ReportSurface page className="min-h-screen">
        <main className="flex flex-col items-center gap-3 p-4">
          <button type="button" id="theme-toggle" className="self-start rounded-full border border-[color:var(--border-faint)] px-3 py-1 text-xs" onClick={() => setTheme(resolvedTheme === "light" ? "dark" : "light")}>
            Theme: {resolvedTheme}
          </button>
          <BookPreview data={inIndic(withQuestions(base, q), lang)} />
        </main>
      </ReportSurface>
    );
  }
  if (view === "pdf") {
    // The PDF test page: ?view=pdf&lang=hi&q=5&src=live|sample&name=Asha%20Rao. Buttons and the real flow, on a phone-sized column.
    const sp = new URLSearchParams(window.location.search);
    const q = Math.max(0, Math.min(5, Number(sp.get("q") ?? 2)));
    const base = (sp.get("src") === "sample" ? sampleReport : (liveReport as unknown as ReportReady));
    const data = inIndic(withQuestions(base, q), lang);
    return (
      <ReportSurface page className="min-h-screen">
        <main className="mx-auto flex max-w-[420px] flex-col gap-3 p-4">
          <button type="button" id="theme-toggle" className="self-start rounded-full border border-[color:var(--border-faint)] px-3 py-1 text-xs" onClick={() => setTheme(resolvedTheme === "light" ? "dark" : "light")}>
            Theme: {resolvedTheme}
          </button>
          <VarshikReportView tier={previewTier()} data={data} reportId="0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d" />
        </main>
      </ReportSurface>
    );
  }
  if (view === "owner") {
    return (
      <ReportSurface page className="min-h-screen">
        <main className="mx-auto flex max-w-[420px] flex-col gap-3 p-4">
          <button type="button" id="theme-toggle" className="self-start rounded-full border border-[color:var(--border-faint)] px-3 py-1 text-xs" onClick={() => setTheme(resolvedTheme === "light" ? "dark" : "light")}>
            Theme: {resolvedTheme}
          </button>
          <OwnerView />
        </main>
      </ReportSurface>
    );
  }
  if (view === "real") {
    return (
      <ReportSurface page className="min-h-screen">
        <main className="mx-auto flex max-w-[420px] flex-col gap-3 p-4">
          <VarshikReportView tier={previewTier()} data={liveReport as unknown as ReportReady} reportId="0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d" />
        </main>
      </ReportSurface>
    );
  }
  if (view === "report") {
    return (
      <ReportSurface page className="min-h-screen">
        <main className="mx-auto flex max-w-[420px] flex-col gap-3 p-4">
          <VarshikReportView tier={previewTier()} data={sampleReport} />
        </main>
      </ReportSurface>
    );
  }
  return (
    <ReportSurface page className="min-h-screen">
    <main className="mx-auto flex max-w-[420px] flex-col gap-5 p-4">
      <button
        type="button"
        id="theme-toggle"
        className="self-start rounded-full border border-[color:var(--border-faint)] px-3 py-1 text-xs"
        onClick={() => setTheme(resolvedTheme === "light" ? "dark" : "light")}
      >
        Theme: {resolvedTheme}
      </button>
      <Block id="art" title="ArtSlot (16:9, 9:16, 1:1)">
        <ArtSlot kind="banner" code="A24" />
        <div className="flex items-start gap-3">
          <ArtSlot kind="opener" code="A2" maxWidth="8rem" />
          <ArtSlot kind="medallion" code="A8" maxWidth="6rem" />
        </div>
      </Block>
      <Block id="ring" title="ScoreRing">
        <ScoreRing score={f.scores.overall.score} tier={f.scores.overall.tier} caption="Your 2027" />
      </Block>
      <Block id="areabars" title="AreaBars">
        <AreaBars areas={f.scores.areaOverall} />
      </Block>
      <Block id="areamonth" title="AreaMonthLine (love)">
        <AreaMonthLine cells={love} areaLabel="Love" bestMonths={[1, 7]} holdMonths={[3]} />
      </Block>
      <Block id="timingmap" title="TimingMap">
        <TimingMap map={f.scores.timingMap} peakMonths={f.scores.peakMonths} restMonth={f.scores.restMonth} />
      </Block>
      <Block id="wave" title="MomentumWave">
        <MomentumWave daily={f.scores.dailyOverall} mudda={f.varsha.flatMap((y) => y.mudda)} sahams={f.sahamWindows} />
      </Block>
      <Block id="moves" title="BigMovesGantt">
        <BigMovesGantt transits={f.ashtakavarga.transits} />
      </Block>
      <Block id="timeline" title="VarshaTimeline">
        <VarshaTimeline years={f.varsha} timezone="Asia/Kolkata" />
      </Block>
      <Block id="pancha" title="PanchadhikariTable">
        <PanchadhikariTable year={v} />
      </Block>
      <Block id="impact" title="PlanetImpactTable">
        <PlanetImpactTable rows={f.scores.planetImpact} />
      </Block>
      <Block id="decision" title="DecisionTable">
        <DecisionTable rows={f.scores.decisionTable} />
      </Block>
      <Block id="dosha" title="DoshaTable">
        <DoshaTable doshas={doshas} />
      </Block>
      <Block id="yoga" title="YogaList">
        <YogaList yogas={f.yogas} />
      </Block>
      <Block id="sky" title="SkyCalendar">
        <SkyCalendar events={f.skyEvents} />
      </Block>
    </main>
    </ReportSurface>
  );
}
