"use client";

import { useTranslation } from "react-i18next";

/**
 * One slot for a piece of the report's artwork. The slot always has the art's REAL aspect ratio, so
 * dropping the finished file in later (pass `src`) changes no layout:
 *   banner    16:9  (1376x768)  month banners, area headers, Chapter VI banners, the closing image
 *   opener    9:16  (768x1376)  chapter openers, framed inside the A4 page and never stretched
 *   medallion 1:1   (1024x1024) planet medallions and remedy icons
 *   divider   20:3  (2000x300)  the gold ornament rule (A47)
 *
 * Without `src` it draws the app's card surface with a fine gold frame and the slot code (e.g. "A24"), so a
 * missing image is obvious in review. It must never reach a reader: the art is added before release.
 */
export type ArtKind = "banner" | "opener" | "medallion" | "divider";

const RATIO: Record<ArtKind, string> = { banner: "16 / 9", opener: "9 / 16", medallion: "1 / 1", divider: "20 / 3" };

export const ART_SIZE: Record<ArtKind, { w: number; h: number }> = {
  banner: { w: 1376, h: 768 },
  opener: { w: 768, h: 1376 },
  medallion: { w: 1024, h: 1024 },
  divider: { w: 2000, h: 300 },
};

export default function ArtSlot({
  kind,
  code,
  src,
  alt = "",
  className = "",
  maxWidth,
}: {
  kind: ArtKind;
  /** The asset code from docs/varshik-2027-image-prompts.md, e.g. "A24". */
  code: string;
  src?: string;
  /** Decorative by default; give words only when the image carries meaning. */
  alt?: string;
  className?: string;
  /** CSS max width, e.g. "12rem" for a medallion or the A4 frame width for an opener. */
  maxWidth?: string;
}) {
  const { t } = useTranslation();
  const { w, h } = ART_SIZE[kind];
  const radius = kind === "medallion" ? "9999px" : kind === "divider" ? "0.4rem" : "0.75rem";
  // A finished medallion (cut out, transparent) and the ornament carry no frame of their own here.
  const bare = !!src && (kind === "medallion" || kind === "divider");

  return (
    <div
      className={`relative w-full ${bare ? "" : "overflow-hidden"} ${className}`}
      style={
        bare
          ? { aspectRatio: RATIO[kind], maxWidth }
          : {
              aspectRatio: RATIO[kind],
              maxWidth,
              borderRadius: radius,
              // The app's own surface tokens, so the frame matches in dark, light and both skins.
              background: "linear-gradient(160deg, var(--surface), var(--card))",
              border: "1px solid var(--border)",
              boxShadow: "inset 0 0 0 3px var(--card), inset 0 0 0 4px var(--border-faint)",
            }
      }
      role={src ? undefined : "img"}
      aria-label={src ? undefined : t("varshik.art.missing", { defaultValue: "Artwork {{code}} to be added", code })}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} width={w} height={h} className="h-full w-full object-contain" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center leading-[1.45]">
          <span className={`font-semibold tracking-wide ${kind === "medallion" ? "text-[10px]" : "text-sm"}`} style={{ color: "var(--gold)" }}>
            {code}
          </span>
          {kind === "medallion" || kind === "divider" ? null : (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {w} × {h}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
