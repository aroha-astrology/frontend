"use client";

import type { TFunction } from "i18next";
import type { ReportSection } from "@/lib/reports-api";
import { AreaBody, AreaOverviewBody, BigMovesBody, BirthChartBody, DoshasBody, GlanceBody, GoldenBody, PlanetsBody, RhythmBody, SkyBody, TimingMapBody, TwoVarshaBody, WhenToActBody, YearLordBody, YogasBody } from "./ChapterPages";
import { ClosingBody, QuestionBody, ReliefBody, RemediesBody, YearCardBody } from "./EndPages";
import { ContentsBody, CoverBody, OpenerBody, WelcomeBody } from "./FrontPages";
import { MonthABody, MonthBBody } from "./MonthPages";
import { BirthStarsBody, ThreeFlagsBody, YourStarsBody } from "./StarPages";
import { areasPresent, monthLong } from "./facts-helpers";
import type { PageDef } from "./page-types";
import type { VarshikFacts } from "./types";
import { withYear } from "./year-context";
import { filterPagesForTier, shownChapterNumbers, type VarshikTierSlug } from "./tier-pages";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * The report's pages in plan order: 57 core pages (54 and the three star pages added in C3), then one page per
 * question the reader is facing (0-5), the relief page and the closing letter, so 59 to 64 in all. Every page is built from the
 * frozen facts and the checked text; a page whose words are missing still shows its chart.
 */
export function buildPages(facts: VarshikFacts, byId: Record<string, ReportSection>, t: TFunction, lang: string, tier: VarshikTierSlug = "complete"): PageDef[] {
  // Chapter numbers as shown (a tier without Chapter IV is numbered I, II, III, IV, V); filled in below, read when a page renders.
  const nos: Record<number, number> = {};
  const yr = facts.year ?? 2027;
  const head = (id: string, key: string, en: string) => byId[id]?.heading || withYear(t(key, { defaultValue: en }), yr);
  const pages: PageDef[] = [];
  const add = (p: PageDef) => pages.push(p);

  add({ key: "cover", chapter: 0, title: "", Body: CoverBody });
  add({ key: "welcome", chapter: 0, title: head("welcome_letter", "varshik.page.welcome", "Welcome"), Body: WelcomeBody });
  add({ key: "contents", chapter: 0, title: t("varshik.page.contents", { defaultValue: "Contents" }), Body: ContentsBody });

  add({
    key: "ch1",
    chapter: 1,
    title: "",
    Body: () => <OpenerBody chapter={1} no={nos[1]} artCode="A2" blurbKey="varshik.opener.1" blurb="Where the year begins: the score, the Year Lord, and the sky that frames it." />,
  });
  add({ key: "glance", chapter: 1, title: head("year_at_a_glance", "varshik.page.glance", "2027 at a glance"), Body: GlanceBody });
  add({ key: "birth", chapter: 1, title: t("varshik.page.birth", { defaultValue: "Your birth chart" }), Body: BirthChartBody });
  add({ key: "birthstars", chapter: 1, title: head("birth_stars", "varshik.page.birthStars", "Your birth stars"), Body: BirthStarsBody });
  add({ key: "varsha", chapter: 1, title: head("two_varsha_years", "varshik.page.varsha", "Your two Varsha years"), Body: TwoVarshaBody });
  add({ key: "yearlord", chapter: 1, title: head("year_lord_muntha", "varshik.page.yearLord", "Your Year Lord and Muntha"), Body: YearLordBody });
  add({ key: "flags", chapter: 1, title: head("three_flags", "varshik.page.flags", "The year's three flags"), Body: ThreeFlagsBody });
  add({ key: "moves", chapter: 1, title: head("big_sky_moves", "varshik.page.moves", "The big moves of the sky"), Body: BigMovesBody });
  add({ key: "planets", chapter: 1, title: head("planet_by_planet", "varshik.page.planets", "Planet by planet"), Body: PlanetsBody });
  add({ key: "doshas", chapter: 1, title: head("doshas", "varshik.page.doshas", "Doshas in your 2027"), Body: DoshasBody });
  add({ key: "yogas", chapter: 1, title: head("yogas", "varshik.page.yogas", "Yogas on your side"), Body: YogasBody });

  add({
    key: "ch2",
    chapter: 2,
    title: "",
    Body: () => <OpenerBody chapter={2} no={nos[2]} artCode="A3" blurbKey="varshik.opener.2" blurb="Love, career, money, health, family, growth and travel, one at a time." />,
  });
  add({ key: "areas", chapter: 2, title: t("varshik.page.areas", { defaultValue: "Seven areas of life" }), Body: AreaOverviewBody });
  for (const a of areasPresent(facts)) {
    add({
      key: `area_${a}`,
      chapter: 2,
      title: head(`area_${a}`, `varshik.area.${a}`, cap(a)),
      Body: ({ ctx }) => <AreaBody ctx={ctx} area={a} />,
    });
  }

  add({
    key: "ch3",
    chapter: 3,
    title: "",
    Body: () => <OpenerBody chapter={3} no={nos[3]} artCode="A4" blurbKey="varshik.opener.3" blurb="When to move and when to wait: your twelve months, your rhythm, your dates." />,
  });
  add({ key: "timing", chapter: 3, title: head("timing_map", "varshik.page.timing", "Your Master Timing Map"), Body: TimingMapBody });
  add({ key: "rhythm", chapter: 3, title: head("year_rhythm", "varshik.page.rhythm", "The rhythm of your year"), Body: RhythmBody });
  add({ key: "sky", chapter: 3, title: head("sky_calendar", "varshik.page.sky", "Sky calendar 2027"), Body: SkyBody });
  add({ key: "yourstars", chapter: 3, title: head("your_stars_2027", "varshik.page.yourStars", "Your stars in 2027"), Body: YourStarsBody });
  add({ key: "act", chapter: 3, title: head("when_to_act", "varshik.page.act", "When to act"), Body: WhenToActBody });
  add({ key: "golden", chapter: 3, title: head("golden_windows", "varshik.page.golden", "Golden windows and key dates"), Body: GoldenBody });

  add({
    key: "ch4",
    chapter: 4,
    title: "",
    Body: () => <OpenerBody chapter={4} no={nos[4]} artCode="A5" blurbKey="varshik.opener.4" blurb="Two pages for every month: the month at a glance, and how to live it." />,
  });
  for (let m = 0; m < 12; m++) {
    const name = `${monthLong(m, lang)} ${yr}`;
    add({
      key: `month_${m}_a`,
      chapter: 4,
      title: name,
      eyebrow: t("varshik.month.glance", { defaultValue: "The month at a glance" }),
      Body: ({ ctx }) => <MonthABody ctx={ctx} month={m} />,
    });
    add({
      key: `month_${m}_b`,
      chapter: 4,
      title: name,
      eyebrow: t("varshik.month.living", { defaultValue: "Living the month" }),
      Body: ({ ctx }) => <MonthBBody ctx={ctx} month={m} />,
    });
  }

  add({ key: "remedies", chapter: 5, title: head("simple_remedies", "varshik.page.remedies", "Simple remedies"), Body: RemediesBody });
  add({ key: "card", chapter: 5, title: t("varshik.page.card", { defaultValue: "Your year on one card" }), Body: YearCardBody });

  for (let n = 1; n <= 5; n++) {
    const section = byId[`question_${n}`];
    if (!section) continue;
    add({ key: `question_${n}`, chapter: 6, title: section.heading, Body: () => <QuestionBody section={section} /> });
  }
  add({ key: "relief", chapter: 6, title: head("what_changes", "varshik.page.relief", "What you have been through, and what changes"), Body: ReliefBody });
  add({ key: "closing", chapter: tier === "basic" ? 7 : 6, title: head("closing_letter", "varshik.page.closing", "A closing letter from Baba Ji"), Body: ClosingBody });
  const shown = filterPagesForTier(pages, tier);
  Object.assign(nos, shownChapterNumbers(shown));
  return shown;
}
