import type { CSSProperties, ReactNode } from "react";
import type { StoryTheme } from "./story-theme";

/**
 * "view": the story on screen, under the viewer's progress bars and above its
 * buttons. "card": the same story inside the 360×640 share card, between the
 * Aroha header and footer (components/stories/ShareCard.tsx).
 */
export type StoryMode = "view" | "card";

/**
 * The backdrop every story sits on: its gradient (or artwork), a soft light
 * at the top, and padding that keeps the content clear of whatever the viewer
 * or the share card draws over the top and bottom edges.
 */
export default function StoryFrame({
  mode,
  theme,
  children,
  footer,
}: {
  mode: StoryMode;
  theme: StoryTheme;
  children: ReactNode;
  /** The buttons under the story. Only shown on screen, never in the shared picture. */
  footer?: ReactNode;
}) {
  const padding =
    mode === "view"
      ? "pt-[calc(var(--sat)+5.5rem)] pb-[calc(var(--sab)+1.25rem)]"
      : "pt-[4.75rem] pb-[5.5rem]";

  return (
    <div
      className="relative h-full w-full overflow-hidden text-white"
      style={{ background: theme.background, "--story-accent": theme.accent } as CSSProperties}
    >
      {theme.art && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- drawn into the share picture, which next/image's lazy loading breaks */}
          <img src={theme.art} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/25 to-black/85" />
        </>
      )}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-18%] h-[62%] w-[150%] -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: `radial-gradient(closest-side, ${theme.glow}, transparent)` }}
      />
      <div className={`relative flex h-full flex-col px-5 ${padding}`}>
        {/* Centred with auto margins, not justify-center: on a very short screen the content then
            runs off the bottom (and is clipped) instead of sliding up under the header. */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="my-auto">{children}</div>
        </div>
        {mode === "view" && footer}
      </div>
    </div>
  );
}

/** The translucent tile the stories lay their facts out on. */
export function StoryTile({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-white/10 bg-white/[0.07] px-3.5 py-3 ${className}`}>{children}</div>;
}

/**
 * Capitals with wide letter-spacing, for English only. Spacing the letters of
 * Devanagari, Bengali, Tamil and the other Indian scripts pulls their joined
 * shapes apart, so every other language gets the caption as written.
 */
export const STORY_CAPS = "[&:lang(en)]:uppercase [&:lang(en)]:tracking-[0.18em]";

/** Small caption above a value or a list. */
export function StoryLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-[10px] font-semibold text-white/55 [&:not(:lang(en))]:text-[11px] ${STORY_CAPS} ${className}`}>{children}</p>;
}

/** Shown in place of a story's content while it loads. */
export function StorySkeleton() {
  return (
    <div className="flex flex-col items-center gap-4" data-testid="story-loading">
      <div className="h-16 w-16 animate-pulse rounded-full bg-white/10" />
      <div className="h-8 w-48 animate-pulse rounded-full bg-white/10" />
      <div className="h-4 w-64 animate-pulse rounded-full bg-white/10" />
      <div className="h-24 w-full animate-pulse rounded-2xl bg-white/10" />
    </div>
  );
}

/** Shown when a story's data could not be loaded. */
export function StoryUnavailable({ message }: { message: string }) {
  return <p className="mx-auto max-w-xs text-center text-sm text-white/70">{message}</p>;
}
