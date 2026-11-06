"use client";

import { useEffect, useMemo } from "react";
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
import ReportSurface, { ReportSection } from "@/components/reports/varshik/ReportSurface";

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

export default function PreviewClient() {
  const { setTheme, resolvedTheme } = useTheme();
  const lang = typeof window === "undefined" ? "en" : (new URLSearchParams(window.location.search).get("lang") ?? "en");
  // Use the app's own loader, so ?lang=<code> shows the real translations from the bundle and i18n/generated.
  useEffect(() => {
    void switchLanguage(lang);
  }, [lang]);
  const indic = lang === "hi" || lang === "ta" ? INDIC[lang] : null;
  const doshas = useMemo(
    () => (indic ? f.doshas.map((d) => ({ ...d, touches: indic.text, remedy: indic.text })) : f.doshas),
    [indic],
  );
  const v = f.varsha[f.varsha.length - 1];
  const love = f.scores.timingMap.love;
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
