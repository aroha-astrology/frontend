import type { ReactNode } from "react";
import type { VarshikData } from "./data";
import type { VarshikTierSlug } from "./tier-pages";

export interface PageCtx extends VarshikData {
  name: string | null;
  /** The edition number printed on page 2, from the report id; null when the id is not known (previews). */
  edition: string | null;
  lang: string;
  /** Which tier's pages are shown. */
  tier: VarshikTierSlug;
  /** Jump to a page by its key (e.g. "month_03_a"). */
  go: (key: string) => void;
  /** Jump to the first page of a chapter. */
  goChapter: (chapter: number) => void;
  pages: { key: string; chapter: number; title: string }[];
}

export interface PageDef {
  key: string;
  /** 0 front matter, 1-6 the chapters. */
  chapter: number;
  /** Heading shown on the page and in the contents list; empty for a bare page (cover, opener). */
  title: string;
  eyebrow?: string;
  Body: (props: { ctx: PageCtx }) => ReactNode;
}
