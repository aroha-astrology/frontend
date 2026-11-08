"use client";

import { forwardRef, useCallback, useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import { useTranslation } from "react-i18next";
import { Share2 } from "lucide-react";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import { imageFileName, shareOrSaveImage, type ImageShareResult } from "@/lib/pdf/share-image";
import { monthLong } from "./facts-helpers";
import { TIER_GLYPH, TIER_WORD } from "./tiers";
import { signName } from "./sign-name";
import type { Tier } from "./types";

/**
 * Share cards: one for the year and one for each month, made from the cover picture.
 * A card carries NO birth time, birth place, coordinates or name. The year card shows the year, its three
 * peak months and, beside them, the Moon sign and the Lagna (C5, owner's request: two signs, each shared by
 * one person in twelve, so they identify no one). A month card shows the month's name and its one-word
 * reading (Go, Steady, Weigh or Rest), and nothing else.
 */
export const CARD_W = 1080;
export const CARD_H = 1350;

export type CardSpec =
  | { kind: "year"; peaks?: number[]; moonSign?: string; lagna?: string }
  | { kind: "month"; month: number; tier: Tier };

const GOLD = "var(--gold-light)";
const SERIF = "var(--vk-serif)";

/** The card at its real size (1080 x 1350). The cover is scaled to the card width and cropped below the title block, so its "Prepared for" line is never shown. */
export const ShareCard = forwardRef<HTMLDivElement, { spec: CardSpec; year: number; lang: string }>(function ShareCard({ spec, year, lang }, ref) {
  const { t } = useTranslation();
  const month = spec.kind === "month";
  return (
    <div
      ref={ref}
      data-testid="share-card"
      style={{ position: "relative", width: CARD_W, height: CARD_H, overflow: "hidden", background: "#0a172a", color: "#fff", fontFamily: "var(--vk-sans)" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/varshphal/cover.webp"
        alt=""
        width={CARD_W}
        height={1610}
        style={{ position: "absolute", left: 0, top: 0, width: CARD_W, height: 1610, objectFit: "cover", filter: month ? "brightness(0.55) saturate(0.9)" : "none" }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: month
            ? "linear-gradient(to bottom, rgba(6,12,24,0.55) 0%, rgba(6,12,24,0.1) 30%, rgba(6,12,24,0.7) 62%, rgba(6,12,24,0.96) 100%)"
            : "linear-gradient(to bottom, rgba(6,12,24,0) 42%, rgba(6,12,24,0.82) 64%, rgba(6,12,24,0.97) 80%, rgba(6,12,24,1) 100%)",
        }}
      />
      <div style={{ position: "absolute", left: 80, right: 80, bottom: 84, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center" }}>
        <span style={{ fontSize: 26, letterSpacing: "0.34em", textTransform: "uppercase", color: GOLD }}>
          {t("varshik.cover.eyebrow", { defaultValue: "Varshik Rashifal" })}
        </span>
        {month ? (
          <>
            <span style={{ fontFamily: SERIF, fontSize: 132, lineHeight: 1.1, color: GOLD, textShadow: "0 0 40px rgba(231,200,151,0.45)" }}>
              {monthLong(spec.month, lang)}
            </span>
            <span style={{ fontFamily: SERIF, fontSize: 64, lineHeight: 1, color: "#fff", opacity: 0.9 }}>{year}</span>
            <span style={{ marginTop: 14, fontSize: 40, color: GOLD }}>
              <span aria-hidden="true">{TIER_GLYPH[spec.tier]} </span>
              {t(TIER_WORD[spec.tier].key, { defaultValue: TIER_WORD[spec.tier].en })}
            </span>
          </>
        ) : (
          <>
            <span style={{ fontFamily: SERIF, fontSize: 200, lineHeight: 1, color: GOLD, textShadow: "0 0 50px rgba(231,200,151,0.5)" }}>{year}</span>
            <span style={{ fontSize: 38, color: "#fff", opacity: 0.92 }}>{t("varshik.cover.title", { defaultValue: "Your year ahead" })}</span>
            {spec.kind === "year" && spec.peaks && spec.peaks.length > 0 ? (
              <span style={{ marginTop: 10, fontSize: 34, color: GOLD }}>
                {t("varshik.share.peaks", {
                  defaultValue: "Peak months: {{months}}",
                  months: spec.peaks.map((m) => monthLong(m, lang)).join(", "),
                })}
              </span>
            ) : null}
            {spec.kind === "year" && spec.moonSign && spec.lagna ? (
              <span style={{ fontSize: 30, color: "#fff", opacity: 0.9 }}>
                {t("varshik.share.signs", {
                  defaultValue: "Moon sign {{moon}} · Lagna {{lagna}}",
                  moon: signName(t, spec.moonSign),
                  lagna: signName(t, spec.lagna),
                })}
              </span>
            ) : null}
          </>
        )}
        <span style={{ marginTop: 22, fontSize: 24, letterSpacing: "0.3em", color: GOLD, opacity: 0.85 }}>AROHA</span>
      </div>
    </div>
  );
});

const PREVIEW_W = 120;
const SCALE = PREVIEW_W / CARD_W;

/** The sheet of 13 cards. Tapping one makes the full-size picture and opens the share sheet (or saves it). */
export function ShareCardsSheet({
  year,
  lang,
  months,
  peaks,
  moonSign,
  lagna,
  onClose,
}: {
  year: number;
  lang: string;
  months: { tier: Tier }[];
  peaks?: number[];
  moonSign?: string;
  lagna?: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const specs: CardSpec[] = [{ kind: "year", peaks, moonSign, lagna }, ...months.map((m, month): CardSpec => ({ kind: "month", month, tier: m.tier }))];
  const [busy, setBusy] = useState<number | null>(null);
  const [note, setNote] = useState<ImageShareResult | "failed" | null>(null);
  const full = useRef<HTMLDivElement>(null);

  const share = useCallback(
    async (i: number) => {
      if (busy !== null) return;
      flushSync(() => {
        setNote(null);
        setBusy(i);
      });
      try {
        await document.fonts?.ready;
        await new Promise<void>((r) => requestAnimationFrame(() => r()));
        const node = full.current;
        if (!node) throw new Error("no card");
        const img = node.querySelector("img");
        if (img && !img.complete) await new Promise<void>((r) => { img.onload = () => r(); img.onerror = () => r(); });
        const { domToBlob } = await import("modern-screenshot");
        const blob = await domToBlob(node, { width: CARD_W, height: CARD_H, scale: 1, type: "image/jpeg", quality: 0.92 });
        const spec = specs[i]!;
        const name = imageFileName("varshik-rashifal", String(year), spec.kind === "year" ? "year" : `month-${String(spec.month + 1).padStart(2, "0")}`);
        setNote(await shareOrSaveImage(blob, name, t("varshik.cover.eyebrow", { defaultValue: "Varshik Rashifal" })));
      } catch {
        setNote("failed");
      } finally {
        setBusy(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busy, year, months, t],
  );

  return (
    <BottomSheetModal onClose={onClose} closeLabel={t("common.close")} header={<div />}>
      <div className="vk-surface flex max-h-[70vh] min-w-0 flex-col gap-4 overflow-y-auto py-1">
        <div className="flex flex-col gap-1">
          <h3 className="vk-h3 m-0">{t("varshik.share.title", { defaultValue: "Share your year" })}</h3>
          <p className="vk-caption m-0">
            {t("varshik.share.hintSigns", { defaultValue: "Pick a card to share. The year card shows your peak months, Moon sign and Lagna; no card shows your name, birth date, time or place." })}
          </p>
        </div>
        <ul className="m-0 grid list-none grid-cols-3 gap-3 p-0">
          {specs.map((spec, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => void share(i)}
                disabled={busy !== null}
                data-testid={`share-card-${i}`}
                aria-label={spec.kind === "year" ? `${year}` : `${monthLong(spec.month, lang)} ${year}`}
                className="vk-panel block w-full overflow-hidden p-0 disabled:opacity-50"
                style={{ aspectRatio: `${CARD_W} / ${CARD_H}`, position: "relative" }}
              >
                <span style={{ position: "absolute", left: 0, top: 0, width: CARD_W, height: CARD_H, transformOrigin: "top left", transform: `scale(${SCALE})`, pointerEvents: "none" }} aria-hidden="true">
                  <ShareCard spec={spec} year={year} lang={lang} />
                </span>
              </button>
            </li>
          ))}
        </ul>
        {note ? (
          <p role="status" className="vk-caption m-0 text-center">
            {note === "failed"
              ? t("varshik.share.failed", { defaultValue: "Couldn't make the card. Please try again." })
              : note === "cancelled"
                ? ""
                : t("varshik.share.done", { defaultValue: "Card ready." })}
          </p>
        ) : null}
      </div>
      {busy !== null
        ? createPortal(
            <div style={{ position: "fixed", left: 0, top: 0, zIndex: -1, pointerEvents: "none" }} aria-hidden="true">
              <ShareCard ref={full} spec={specs[busy]!} year={year} lang={lang} />
            </div>,
            document.body,
          )
        : null}
    </BottomSheetModal>
  );
}

export function ShareCardsButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-1.5 rounded-full border border-gold/30 px-4 py-2 text-xs font-semibold text-gold">
      <Share2 size={14} aria-hidden="true" />
      {t("varshik.share.button", { defaultValue: "Share cards" })}
    </button>
  );
}
