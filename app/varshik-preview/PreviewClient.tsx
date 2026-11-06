"use client";

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

function Block({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="flex flex-col gap-3 rounded-2xl border border-[color:var(--border-faint)] bg-[color:var(--card)] p-4">
      <h2 className="text-sm font-semibold text-[color:var(--gold)]">{title}</h2>
      {children}
    </section>
  );
}

export default function PreviewClient() {
  const { setTheme, resolvedTheme } = useTheme();
  const v = f.varsha[f.varsha.length - 1];
  const love = f.scores.timingMap.love;
  return (
    <main className="mx-auto flex max-w-[420px] flex-col gap-5 p-4">
      <button
        type="button"
        id="theme-toggle"
        className="self-start rounded-full border border-[color:var(--border-faint)] px-3 py-1 text-xs"
        onClick={() => setTheme(resolvedTheme === "light" ? "dark" : "light")}
      >
        Theme: {resolvedTheme}
      </button>
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
    </main>
  );
}
