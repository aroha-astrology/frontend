"use client";

import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { chapterArtSrc, printedPageNumber, type BookPage } from "@/lib/report-book";
import BookChartView from "./BookCharts";

/**
 * The pages of the report book. One theme for every page (owner, 2026-10-24: "maintain same theme
 * all across the report"): a deep navy page, gold headings and line art, soft-white text. The
 * artwork (public/report-book/*.svg) is drawn once and shared by every reader; only the name on
 * the cover and the text of the report differ.
 *
 * Sizes are in `cqw` (1% of the page's width), so a page looks the same at 300 px wide on a phone
 * and 480 px wide on a desktop spread, and the character budget in lib/report-book.ts holds.
 */

const NAVY = "#0f1633";
const GOLD = "#dfb564";
const GOLD_LIGHT = "#fbe09b";
const INK = "#f3ecd9";

const pageBox: CSSProperties = {
  containerType: "size",
  position: "relative",
  width: "100%",
  height: "100%",
  overflow: "hidden",
  color: INK,
  background: `linear-gradient(165deg, #151d45 0%, ${NAVY} 60%)`,
};

/** Whether the book is set in handwriting (admin switch nav.reportBookHandwriting). Off: the same
 * accents (name, pull-quotes) are set in an italic serif instead. */
export const HandwritingContext = createContext(false);

const HANDWRITING: CSSProperties = { fontFamily: "var(--font-hand), 'Kalam', cursive" };
const SERIF_ITALIC: CSSProperties = { fontFamily: "var(--font-serif), Georgia, serif", fontStyle: "italic" };

function useHand(): CSSProperties {
  return useContext(HandwritingContext) ? HANDWRITING : SERIF_ITALIC;
}
const display: CSSProperties = { fontFamily: "var(--font-display), serif" };

function Page({ children, testId }: { children: ReactNode; testId?: string }) {
  return (
    <div style={pageBox} data-testid={testId}>
      {children}
    </div>
  );
}

function PageNumber({ index }: { index: number }) {
  return (
    <div
      style={{ position: "absolute", bottom: "4cqw", left: 0, right: 0, textAlign: "center", fontSize: "3cqw", color: GOLD, opacity: 0.8, ...display }}
    >
      {printedPageNumber(index)}
    </div>
  );
}

/* ------------------------------------------------------------- covers */

export function CoverFront({ title, name, dateLabel }: { title: string; name: string | null; dateLabel: string }) {
  const { t } = useTranslation();
  const hand = useHand();
  return (
    <div style={{ ...pageBox, background: NAVY }} data-testid="book-cover">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/report-book/cover-art.svg" alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      {/* The brand mark sits in the empty centre of the artwork's mandala. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo_transparent.png"
        alt="Aroha Astrology"
        style={{ position: "absolute", left: "50%", top: "41.2%", width: "33cqw", height: "33cqw", transform: "translate(-50%,-50%)", borderRadius: "50%" }}
      />
      <div style={{ position: "absolute", top: "8.6%", left: 0, right: 0, textAlign: "center", ...display, color: GOLD, fontSize: "3cqw", letterSpacing: "0.32em" }}>
        AROHA ASTROLOGY
      </div>
      <div style={{ position: "absolute", left: "10cqw", right: "10cqw", top: "67.5%", textAlign: "center" }}>
        <div style={{ ...display, color: GOLD, fontSize: "6.2cqw", lineHeight: 1.2, letterSpacing: "0.04em" }}>{title}</div>
        {name && (
          <>
            <div style={{ marginTop: "3.2cqw", fontSize: "2.8cqw", letterSpacing: "0.22em", textTransform: "uppercase", color: INK, opacity: 0.8 }}>
              {t("reports.book.preparedFor", "Prepared for")}
            </div>
            <div data-testid="book-cover-name" style={{ ...hand, color: GOLD_LIGHT, fontSize: "8cqw", lineHeight: 1.15, marginTop: "0.6cqw" }}>
              {name}
            </div>
          </>
        )}
        <div style={{ marginTop: "2.4cqw", fontSize: "2.6cqw", color: INK, opacity: 0.7 }}>{dateLabel}</div>
      </div>
    </div>
  );
}

export function CoverBack() {
  const { t } = useTranslation();
  const hand = useHand();
  return (
    <div style={{ ...pageBox, background: NAVY }} data-testid="book-back-cover">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/report-book/back-art.svg" alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      <div style={{ position: "absolute", left: "12cqw", right: "12cqw", top: "64%", textAlign: "center" }}>
        <div style={{ ...hand, color: GOLD_LIGHT, fontSize: "5.4cqw", lineHeight: 1.3 }}>{t("reports.book.backLine", "May the stars walk with you.")}</div>
        <div style={{ ...display, marginTop: "5cqw", color: GOLD, fontSize: "3cqw", letterSpacing: "0.3em" }}>AROHA ASTROLOGY</div>
      </div>
    </div>
  );
}

/** The inside of a cover: just the night sky, so the first and last spreads are not bare. */
export function Endpaper() {
  return (
    <div style={{ ...pageBox, background: NAVY }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/report-book/back-art.svg" alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.55 }} />
    </div>
  );
}

export function BlankPage() {
  return (
    <Page>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/report-book/divider.svg" alt="" style={{ position: "absolute", left: "8cqw", right: "8cqw", top: "50%", width: "84cqw", transform: "translateY(-50%)", opacity: 0.8 }} />
    </Page>
  );
}

/* ------------------------------------------------------------- inside */

const inner: CSSProperties = { position: "absolute", left: "8cqw", right: "8cqw", top: "8cqw", bottom: "11cqw", overflow: "hidden" };

function Divider({ style }: { style?: CSSProperties }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/report-book/divider.svg" alt="" style={{ display: "block", width: "100%", ...style }} />
  );
}

function Contents({ chapters, picture, index }: { chapters: Array<{ heading: string; page: number }>; picture?: string; index: number }) {
  const { t } = useTranslation();
  return (
    <Page testId="book-page-contents">
      <div style={inner}>
        <div style={{ ...display, color: GOLD, fontSize: "6cqw", textAlign: "center" }}>{t("reports.book.contents", "Contents")}</div>
        <Divider style={{ margin: "2cqw 0 3cqw" }} />
        {picture && (
          // The report's own picture, the one its card and screen already use.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={picture}
            alt=""
            data-testid="book-report-picture"
            style={{ display: "block", width: "100%", height: "32cqw", objectFit: "cover", borderRadius: "3cqw", border: `0.4cqw solid ${GOLD}`, marginBottom: "4cqw" }}
          />
        )}
        <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {chapters.slice(0, picture ? 8 : 12).map((c, i) => (
            <li key={i} style={{ display: "flex", gap: "2cqw", alignItems: "baseline", fontSize: "3.8cqw", lineHeight: 1.35, marginBottom: "2.2cqw" }}>
              <span style={{ color: GOLD, minWidth: "5cqw" }}>{i + 1}.</span>
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.heading}</span>
              <span style={{ color: GOLD, opacity: 0.85 }}>{c.page}</span>
            </li>
          ))}
        </ol>
      </div>
      <PageNumber index={index} />
    </Page>
  );
}

function ChartPage({ chart, index }: { chart: Extract<BookPage, { kind: "chart" }>["chart"]; index: number }) {
  const { t } = useTranslation();
  return (
    <Page testId="book-page-chart">
      <div style={inner}>
        <div style={{ ...display, color: GOLD, fontSize: "5.4cqw", textAlign: "center", lineHeight: 1.25 }}>{t(chart.title)}</div>
        <Divider style={{ margin: "2cqw 0 2cqw" }} />
        <div style={{ height: "calc(100% - 20cqw)", display: "flex", alignItems: "center" }}>
          <div style={{ width: "100%" }}>
            <BookChartView chart={chart} />
          </div>
        </div>
      </div>
      <PageNumber index={index} />
    </Page>
  );
}

function Chapter({ page, index }: { page: Extract<BookPage, { kind: "chapter" }>; index: number }) {
  const hand = useHand();
  return (
    <Page testId="book-page-chapter">
      <div style={inner}>
        {page.opener ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={chapterArtSrc(page.art)} alt="" style={{ display: "block", width: "100%", height: "32cqw", objectFit: "contain" }} />
            <div style={{ ...display, color: GOLD, fontSize: "6cqw", lineHeight: 1.2, textAlign: "center", marginTop: "1.5cqw" }}>{page.heading}</div>
            <Divider style={{ margin: "1.4cqw 0 2cqw" }} />
            {page.hook && (
              <p style={{ ...hand, color: GOLD_LIGHT, fontSize: "4.4cqw", lineHeight: 1.35, margin: "0 0 2.4cqw", textAlign: "center" }}>{page.hook}</p>
            )}
          </>
        ) : (
          <>
            <div style={{ ...display, color: GOLD, opacity: 0.8, fontSize: "2.8cqw", letterSpacing: "0.14em", textTransform: "uppercase", textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {page.heading}
            </div>
            <Divider style={{ margin: "1.2cqw 0 3cqw" }} />
          </>
        )}
        {page.paragraphs.map((p, i) => (
          <p key={i} style={{ margin: "0 0 2.2cqw", fontSize: "4cqw", lineHeight: 1.52 }}>
            {p}
          </p>
        ))}
        {page.bullets.length > 0 && (
          <ul style={{ listStyle: "none", margin: "1cqw 0 0", padding: 0 }}>
            {page.bullets.map((b, i) => (
              <li key={i} style={{ display: "flex", gap: "2.2cqw", fontSize: "3.9cqw", lineHeight: 1.45, marginBottom: "1.8cqw" }}>
                <span style={{ color: GOLD, flexShrink: 0 }}>✦</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <PageNumber index={index} />
    </Page>
  );
}

function Closing({ index }: { index: number }) {
  const { t } = useTranslation();
  const hand = useHand();
  return (
    <Page testId="book-page-closing">
      <div style={{ ...inner, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={chapterArtSrc("general")} alt="" style={{ width: "100%", height: "36cqw", objectFit: "contain" }} />
        <p style={{ ...hand, color: GOLD_LIGHT, fontSize: "5cqw", lineHeight: 1.35, margin: "4cqw 0 2cqw" }}>
          {t("reports.book.closing", "The stars incline; they do not compel. Walk gently, and choose well.")}
        </p>
        <p style={{ fontSize: "3.2cqw", opacity: 0.7, lineHeight: 1.5, margin: 0 }}>
          {t("reports.book.disclaimer", "This reading is traditional astrology offered for reflection. It is not medical, legal or financial advice.")}
        </p>
      </div>
      <PageNumber index={index} />
    </Page>
  );
}

export function renderBookPage(page: BookPage, index: number): ReactNode {
  switch (page.kind) {
    case "contents":
      return <Contents chapters={page.chapters} picture={page.picture} index={index} />;
    case "chart":
      return <ChartPage chart={page.chart} index={index} />;
    case "chapter":
      return <Chapter page={page} index={index} />;
    case "closing":
      return <Closing index={index} />;
  }
}
