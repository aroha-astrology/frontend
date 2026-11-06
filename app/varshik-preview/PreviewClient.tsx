"use client";

import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
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

/** Long Indic strings (about 1.5x the English width) so the layouts are tested the way the real report will be. */
const INDIC = {
  hi: {
    area: ["प्रेम और संबंध", "करियर और कार्यक्षेत्र", "धन और बचत", "स्वास्थ्य और ऊर्जा", "परिवार और घर", "आत्मविकास और शिक्षा", "यात्रा और विदेश"],
    tier: ["आगे बढ़ें", "स्थिर रहें", "सोच-समझकर चलें", "विश्राम और धैर्य"],
    text: "यह अवधि साझेदारी, स्वभाव और ऊर्जा को छूती है, इसलिए शांत रहकर निर्णय लेना अच्छा रहेगा।",
  },
  ta: {
    area: ["காதல் மற்றும் உறவுகள்", "தொழில் மற்றும் பணி", "பணம் மற்றும் சேமிப்பு", "ஆரோக்கியம் மற்றும் சக்தி", "குடும்பம் மற்றும் வீடு", "வளர்ச்சி மற்றும் கல்வி", "பயணம் மற்றும் வெளிநாடு"],
    tier: ["முன்னேறுங்கள்", "நிலையாக இருங்கள்", "யோசித்து செல்லுங்கள்", "ஓய்வும் பொறுமையும்"],
    text: "இந்தக் காலம் கூட்டாண்மை, மனநிலை மற்றும் சக்தியைத் தொடுகிறது, எனவே அமைதியாக முடிவெடுப்பது நல்லது.",
  },
} as const;
const AREA_KEYS = ["love", "career", "money", "health", "family", "growth", "travel"];
const TIER_KEYS = ["go", "steady", "weigh", "hold"];

function Block({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <ReportSection id={id} eyebrow="Varshik Rashifal 2027" title={title} beam={id === "ring"}>
      {children}
    </ReportSection>
  );
}

export default function PreviewClient() {
  const { setTheme, resolvedTheme } = useTheme();
  const { i18n } = useTranslation();
  const lang = typeof window === "undefined" ? "en" : (new URLSearchParams(window.location.search).get("lang") ?? "en");
  const indic = lang === "hi" || lang === "ta" ? INDIC[lang] : null;
  useEffect(() => {
    if (indic) {
      const res: Record<string, string> = {};
      AREA_KEYS.forEach((k, i) => (res[`varshik.area.${k}`] = indic.area[i]));
      TIER_KEYS.forEach((k, i) => (res[`varshik.tier.${k}`] = indic.tier[i]));
      i18n.addResources(lang, "translation", res);
    }
    void i18n.changeLanguage(lang);
  }, [i18n, indic, lang]);
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
