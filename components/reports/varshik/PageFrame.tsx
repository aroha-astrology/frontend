"use client";

import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

export const CHAPTER_EN = [
  "Your report",
  "The shape of your year",
  "Seven areas of life",
  "Your timing",
  "Month by month",
  "Carrying it with you",
  "Your questions, answered",
];

/** One page of the report: running header, the content, a gold page number in the footer. */
export default function PageFrame({
  chapter,
  name,
  pageNo,
  total,
  title,
  eyebrow,
  a4 = false,
  children,
}: {
  chapter: number;
  name: string | null;
  pageNo: number;
  total: number;
  title?: string;
  eyebrow?: string;
  /** The PDF's page box: a fixed A4 sheet (794 x 1123 px). The title and body sit in a fitted region that PdfBook shrinks a font step at a time until it fits. */
  a4?: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  if (a4) {
    return (
      <article className="vk-panel vk-page-art vk-a4" aria-label={title} data-vk-page={pageNo}>
        <header className="vk-a4-head">
          <span className="vk-caption min-w-0 break-words">{t(`varshik.chapter.${chapter}`, { defaultValue: CHAPTER_EN[chapter] })}</span>
          {name ? (
            <span className="vk-caption min-w-0 break-words">{t("varshik.page.preparedFor", { defaultValue: "Prepared for {{name}}", name })}</span>
          ) : null}
        </header>
        <div className="vk-a4-body" data-a4-body>
          <div className="vk-a4-inner flex min-w-0 flex-col gap-4" data-a4-inner>
            {title ? (
              <div className="flex min-w-0 flex-col gap-2">
                {eyebrow ? <span className="vk-eyebrow">{eyebrow}</span> : null}
                <h2 className="vk-title m-0 min-w-0 break-words">{title}</h2>
                <hr className="vk-rule m-0" aria-hidden="true" />
              </div>
            ) : null}
            <div className="flex min-w-0 flex-col gap-5">{children}</div>
          </div>
        </div>
        <footer className="vk-a4-foot">
          <span className="vk-caption" style={{ letterSpacing: "0.18em" }}>AROHA</span>
          <span className="tabular-nums" style={{ color: "var(--gold)", fontFamily: "var(--vk-serif)", fontSize: "1.1rem" }}>
            {pageNo} <span className="vk-caption">/ {total}</span>
          </span>
        </footer>
      </article>
    );
  }
  return (
    <article className="vk-panel vk-page-art flex min-w-0 flex-col gap-4 p-5" aria-label={title}>
      <header className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="vk-caption min-w-0 break-words">{t(`varshik.chapter.${chapter}`, { defaultValue: CHAPTER_EN[chapter] })}</span>
        {name ? (
          <span className="vk-caption min-w-0 break-words">
            {t("varshik.page.preparedFor", { defaultValue: "Prepared for {{name}}", name })}
          </span>
        ) : null}
      </header>
      {title ? (
        <div className="flex min-w-0 flex-col gap-2">
          {eyebrow ? <span className="vk-eyebrow">{eyebrow}</span> : null}
          <h2 className="vk-title m-0 min-w-0 break-words">{title}</h2>
          <hr className="vk-rule m-0" aria-hidden="true" />
        </div>
      ) : null}
      <div className="flex min-w-0 flex-col gap-5">{children}</div>
      <footer className="flex items-center justify-between pt-2">
        <span className="vk-caption" style={{ letterSpacing: "0.18em" }}>AROHA</span>
        <span className="tabular-nums" style={{ color: "var(--gold)", fontFamily: "var(--vk-serif)", fontSize: "1.1rem" }}>
          {pageNo} <span className="vk-caption">/ {total}</span>
        </span>
      </footer>
    </article>
  );
}
