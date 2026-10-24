"use client";

import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { PalmCaptureSlot, PalmEvent } from "@/lib/palm-api";
import { usePdfCapturing } from "@/components/pdf/PdfCapturingContext";

/**
 * The reader's own palm photographs, swiped one by one, with their dated life events under them.
 *
 * Nothing is drawn on the photos (owner, 2026-10-23: "we will not draw the lines"): the traced
 * lines are still measured on the server, and still date the events, but they are not shown. The
 * events are plain cards here; a card's age is shown only for a paid reading.
 */

export interface PalmPhoto {
  slot: PalmCaptureSlot;
  url: string;
}

export interface PalmPhotoViewProps {
  /** The captured photos, front first. Empty while they load. */
  photos: PalmPhoto[];
  events?: PalmEvent[];
  /** Ages are shown only for a paid reading; a scan-only reading shows locked cards. */
  unlocked?: boolean;
}

export default function PalmPhotoView({ photos, events = [], unlocked = false }: PalmPhotoViewProps) {
  const { t } = useTranslation();
  const capturing = usePdfCapturing();
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  // A saved PDF of the reading shows the front photo only; a swipe strip has no place on paper.
  const shown = capturing ? photos.slice(0, 1) : photos;

  const sourceLabel = (source: string) =>
    source === "marriageLine" || source === "childrenLine" ? t(`palm.map.${source}`) : t(`palm.line.${source}`);

  // A paid reading shows the age; an event the hand indicates but cannot date (children lines)
  // says so instead of looking locked.
  const ageText = (e: PalmEvent) =>
    !unlocked || e.locked
      ? t("palm.map.lockedAge")
      : e.ages.length === 0
        ? t("palm.map.noAge")
        : t("palm.map.age", { age: e.ages.map((a) => a.age).join(" · ") });

  function onScroll() {
    const el = scroller.current;
    if (!el || el.clientWidth === 0) return;
    setIndex(Math.max(0, Math.min(shown.length - 1, Math.round(el.scrollLeft / el.clientWidth))));
  }

  function goTo(i: number) {
    const el = scroller.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-3xl border border-gold/20 bg-black">
        <div
          ref={scroller}
          onScroll={onScroll}
          data-testid="palm-carousel"
          className="flex w-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {shown.length === 0 ? (
            <div className="flex aspect-[4/5] w-full shrink-0 items-center justify-center text-sm text-white/60">…</div>
          ) : (
            shown.map((p) => (
              <figure key={p.slot} className="relative aspect-[4/5] w-full shrink-0 snap-center" data-testid={`palm-slide-${p.slot}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className="h-full w-full object-contain" />
                <figcaption className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
                  {t(`palm.guide.step.${p.slot}.title`)}
                </figcaption>
              </figure>
            ))
          )}
        </div>

      </div>

      {shown.length > 1 && (
        <div className="flex items-center justify-center gap-2" data-testid="palm-carousel-dots">
          {shown.map((p, i) => (
            <button
              key={p.slot}
              type="button"
              onClick={() => goTo(i)}
              aria-label={t(`palm.guide.step.${p.slot}.title`)}
              aria-current={i === index}
              className={`h-2 rounded-full transition-all ${i === index ? "w-5 bg-gold" : "w-2 bg-white/30"}`}
            />
          ))}
        </div>
      )}

      {events.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5" data-testid="palm-events">
          {events.map((event) => (
            <div key={event.kind} className="rounded-2xl border border-gold/25 bg-card p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gold">{t(`palm.map.${event.kind}`)}</p>
              <p className={`mt-1 font-extrabold text-foreground ${unlocked && !event.locked ? "text-lg" : "text-sm"}`}>
                {ageText(event)}
              </p>
              <p className="mt-0.5 text-[11px] text-muted">{sourceLabel(event.source)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
