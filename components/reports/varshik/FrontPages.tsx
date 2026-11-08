"use client";

import { useTranslation } from "react-i18next";
import { useReportYear, useY } from "./year-context";
import ArtSlot from "./ArtSlot";
import VarshikCover from "./VarshikCover";
import Narrative from "./Narrative";
import { art, CHAPTER_ART } from "./assets";
import { CHAPTER_EN } from "./PageFrame";
import { TIER_COLOR, TIER_GLYPH, TIER_WORD, useChartMode } from "./tiers";
import type { Tier } from "./types";
import type { PageCtx } from "./page-types";

const TIERS: { tier: Tier; range: string }[] = [
  { tier: "dark_green", range: "75+" },
  { tier: "light_green", range: "60-74" },
  { tier: "amber", range: "45-59" },
  { tier: "rust", range: "<45" },
];
const ROMAN = ["", "I", "II", "III", "IV", "V", "VI"];
const HAND = "var(--font-hand), var(--vk-serif)";

/** Page 1. Title, year and the reader's name are live text (translatable, reusable for 2028); the art carries no words. */
export function CoverBody({ ctx }: { ctx: PageCtx }) {
  const { t } = useTranslation();
  const year = useReportYear();
  return (
    <div className="flex min-w-0 flex-col items-center gap-5 py-2 text-center">
      {/* The owner's cover picture; the reader's name is written on its dashed "Prepared for" line (VarshikCover). */}
      <div className="w-full" style={{ maxWidth: "20rem" }}>
        <VarshikCover name={ctx.name} writeOn />
      </div>
      <div className="flex min-w-0 flex-col items-center gap-1">
        <span className="vk-eyebrow">{t("varshik.cover.eyebrow", { defaultValue: "Varshik Rashifal" })}</span>
        <span
          className="vk-foil leading-none"
          style={{ fontFamily: "var(--vk-serif)", fontSize: "5rem", fontWeight: 400 }}
        >
          {year}
        </span>
        <h1 className="vk-title m-0 break-words">{t("varshik.cover.title", { defaultValue: "Your year ahead" })}</h1>
      </div>
    </div>
  );
}

/** Page 2. Baba Ji's welcome letter, how to read the four colours, and the monthly habit. */
export function WelcomeBody({ ctx }: { ctx: PageCtx }) {
  const { t } = useTranslation();
  const y = useY();
  const mode = useChartMode();
  const tierWord = (tier: Tier) => t(TIER_WORD[tier].key, { defaultValue: TIER_WORD[tier].en });
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex items-center gap-4">
        {art("A51") ? (
          // Baba Ji's portrait shows through the oval of the gold frame (A51, cut out so the centre is clear).
          <span className="relative inline-block shrink-0" style={{ width: "6.25rem", aspectRatio: "768 / 1376" }}>
            <span className="absolute overflow-hidden" style={{ left: "23.8%", top: "27.8%", width: "52.4%", height: "42.9%", borderRadius: "50%" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/yogi-baba.webp" alt="" className="h-full w-full object-cover" />
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={art("A51")} alt="" width={768} height={1376} className="absolute inset-0 h-full w-full" />
          </span>
        ) : (
          <span
            className="relative inline-block shrink-0 overflow-hidden rounded-full"
            style={{
              width: "5.5rem",
              height: "5.5rem",
              border: "2px solid var(--gold)",
              boxShadow: "0 0 0 4px var(--card), 0 0 0 5px var(--border-faint), 0 0 24px -6px var(--gold)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/yogi-baba.webp" alt="" className="h-full w-full object-cover" />
          </span>
        )}
        <div className="flex min-w-0 flex-col">
          <span className="vk-eyebrow">{t("varshik.welcome.from", { defaultValue: "A letter from" })}</span>
          <span className="vk-h3 break-words">{t("varshik.welcome.babaJi", { defaultValue: "Baba Ji" })}</span>
        </div>
      </div>
      <Narrative section={ctx.byId.welcome_letter} dropCap />
      <div className="flex min-w-0 flex-col gap-3">
        <h3 className="vk-h3 m-0">{t("varshik.welcome.howToRead", { defaultValue: "How to read your colours" })}</h3>
        <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0">
          {TIERS.map(({ tier, range }) => (
            <li key={tier} className="flex min-w-0 items-center gap-2 rounded-lg border border-[color:var(--border-faint)] p-2">
              <span aria-hidden="true" className="inline-block h-5 w-5 shrink-0 rounded-[5px]" style={{ background: TIER_COLOR[mode][tier] }} />
              <span className="vk-caption min-w-0 break-words" style={{ color: "var(--foreground)" }}>
                <span aria-hidden="true">{TIER_GLYPH[tier]} </span>
                {tierWord(tier)} <span style={{ color: "var(--text-muted)" }}>{range}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="vk-body m-0 break-words">
          {t("varshik.welcome.monthly", {
            defaultValue: "Open this report on the 1st of each month and read that month's two pages. The year is a map; the month is where you walk.",
          })}
        </p>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span style={{ fontFamily: HAND, fontSize: "1.6rem", color: "var(--gold)" }}>
          {t("varshik.welcome.babaJi", { defaultValue: "Baba Ji" })}
        </span>
        <ArtSlot kind="medallion" code="A49" src={art("A49")} maxWidth="4.5rem" />
      </div>
      <hr className="vk-rule m-0" aria-hidden="true" />
      <p className="vk-caption m-0 text-center">
        {ctx.edition
          ? y(t("varshik.welcome.editionNo", { defaultValue: "Edition 2027 · No. {{n}}", n: ctx.edition }))
          : y(t("varshik.welcome.edition", { defaultValue: "Edition 2027" }))}
      </p>
    </div>
  );
}

/** Page 3. The chapters, each with its thumbnail and page range; tapping one jumps there. */
export function ContentsBody({ ctx }: { ctx: PageCtx }) {
  const { t } = useTranslation();
  const rows = [1, 2, 3, 4, 5, 6]
    .map((chapter) => {
      const own = ctx.pages.map((p, i) => ({ ...p, i })).filter((p) => p.chapter === chapter);
      return own.length ? { chapter, from: own[0]!.i + 1, to: own[own.length - 1]!.i + 1 } : null;
    })
    .filter((r): r is { chapter: number; from: number; to: number } => r !== null);
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {rows.map((r) => {
        const code = CHAPTER_ART[r.chapter - 1] ?? "A2";
        return (
          <li key={r.chapter}>
            <button type="button" onClick={() => ctx.goChapter(r.chapter)} className="vk-panel flex w-full min-w-0 items-center gap-3 p-3 text-left">
              <ArtSlot kind="medallion" code={code} src={art(code)} maxWidth="3.25rem" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="vk-eyebrow">{t("varshik.contents.chapter", { defaultValue: "Chapter {{n}}", n: ROMAN[r.chapter] })}</span>
                <span className="vk-h3 break-words">{t(`varshik.chapter.${r.chapter}`, { defaultValue: CHAPTER_EN[r.chapter] })}</span>
              </span>
              <span className="tabular-nums" style={{ color: "var(--gold)", fontFamily: "var(--vk-serif)" }}>
                {r.from}
                {r.to !== r.from ? `–${r.to}` : ""}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** A chapter opener: the art framed inside the page (never stretched), the chapter number and its name. */
export function OpenerBody({ chapter, artCode, blurbKey, blurb }: { chapter: number; artCode: string; blurbKey: string; blurb: string }) {
  const { t } = useTranslation();
  const wide = artCode === "A6" || artCode === "A52";
  return (
    <div className="flex min-w-0 flex-col items-center gap-4 py-2 text-center">
      <ArtSlot kind={wide ? "banner" : "opener"} code={artCode} src={art(artCode)} maxWidth={wide ? "100%" : "15rem"} />
      <span className="vk-eyebrow">{t("varshik.contents.chapter", { defaultValue: "Chapter {{n}}", n: ROMAN[chapter] })}</span>
      <h2 className="vk-title m-0 break-words">{t(`varshik.chapter.${chapter}`, { defaultValue: CHAPTER_EN[chapter] })}</h2>
      <hr className="vk-rule m-0 w-32" aria-hidden="true" />
      <p className="vk-body m-0 max-w-xs break-words" style={{ color: "var(--text-muted)" }}>
        {t(blurbKey, { defaultValue: blurb })}
      </p>
    </div>
  );
}
