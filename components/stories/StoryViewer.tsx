"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { BookOpen, CalendarDays, ChevronRight, Clock, Flower2, Share2, X, type LucideIcon } from "lucide-react";
import type { DailyStoriesData } from "@/hooks/useDailyStories";
import { useFeature } from "@/hooks/useFeature";
import { track } from "@/lib/analytics";
import { storyDateLabel } from "@/lib/stories/format";
import { STORY_IDS, type StoryId } from "@/lib/stories/types";
import { useDismissOnBackPress } from "@/providers/back-handler-provider";
import StoryFrame from "./StoryFrame";
import StoryShareSheet from "./StoryShareSheet";
import { STORY_SLIDES } from "./slides";
import { buildStoryMeta } from "./story-meta";

/** How long a story stays up before the next one takes over. */
const STORY_MS = 8_000;
/** A press longer than this is a hold (pause), not a tap. */
const TAP_MS = 350;
/** Finger travel beyond this is a drag, not a tap. */
const TAP_SLOP = 12;
/** A downward drag this long closes the viewer. */
const SWIPE_CLOSE = 80;

const ICONS: Record<StoryId, LucideIcon> = {
  panchang: CalendarDays,
  hora: Clock,
  deity: Flower2,
  gita: BookOpen,
};

/**
 * The full-screen story player behind the ring on the Home avatar. One bar per
 * story across the top; the running one fills as its time runs. Tap the right
 * side for the next story and the left for the one before, hold to pause,
 * drag down (or press back, or Esc) to close. On a wide screen it is a
 * phone-shaped card in the middle.
 */
export default function StoryViewer({
  open,
  startIndex,
  data,
  onClose,
  onSeen,
}: {
  open: boolean;
  /** Which story to open on (the first one not yet seen today). */
  startIndex: number;
  data: DailyStoriesData;
  onClose: () => void;
  onSeen: (id: StoryId) => void;
}) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const links = {
    panchang: useFeature("nav.panchang").enabled,
    shlokas: useFeature("nav.shlokas").enabled,
    gita: useFeature("nav.gita").enabled,
  };

  // `document` does not exist during SSR, so mount first, then portal.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [index, setIndex] = useState(startIndex);
  const [held, setHeld] = useState(false);
  const [sharing, setSharing] = useState(false);
  const press = useRef<{ x: number; y: number; at: number } | null>(null);

  const id = STORY_IDS[Math.min(index, STORY_IDS.length - 1)]!;

  // Every opening starts on the first unseen story, with nothing left over from the last one.
  useEffect(() => {
    if (!open) return;
    setIndex(startIndex);
    setHeld(false);
    setSharing(false);
    track("story_opened", { story: STORY_IDS[startIndex] ?? "panchang" });
    // startIndex is read once per opening on purpose: marking a story seen changes it while the viewer is up.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    onSeen(id);
    track("story_viewed", { story: id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, id]);

  const next = useCallback(() => {
    if (index >= STORY_IDS.length - 1) onClose();
    else setIndex(index + 1);
  }, [index, onClose]);

  const previous = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  useDismissOnBackPress(open && !sharing, onClose);

  // The page behind must not scroll under the viewer.
  useEffect(() => {
    if (!open) return;
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = before;
    };
  }, [open]);

  useEffect(() => {
    if (!open || sharing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") previous();
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, sharing, next, previous, onClose]);

  if (!mounted) return null;

  const meta = buildStoryMeta(id, data, t, i18n.language, links);
  const Slide = STORY_SLIDES[id];
  const Icon = ICONS[id];
  const loading =
    id === "panchang" || id === "hora" ? data.panchangState === "loading" : id === "gita" && data.verseState === "loading";
  // A story still loading keeps its full time for when there is something to read.
  const paused = held || sharing || loading;

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    press.current = { x: e.clientX, y: e.clientY, at: Date.now() };
    setHeld(true);
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    const start = press.current;
    press.current = null;
    setHeld(false);
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (dy > SWIPE_CLOSE && dy > Math.abs(dx)) return onClose();
    if (Date.now() - start.at > TAP_MS || Math.abs(dx) > TAP_SLOP || Math.abs(dy) > TAP_SLOP) return;
    const box = e.currentTarget.getBoundingClientRect();
    if (e.clientX - box.left < box.width * 0.3) previous();
    else next();
  }

  function onPointerCancel() {
    press.current = null;
    setHeld(false);
  }

  function openCta(href: string) {
    track("story_cta_clicked", { story: id });
    onClose();
    router.push(href);
  }

  const footer = (
    <div className="relative z-10 mt-4 flex items-center gap-3">
      {meta.cta && (
        <button
          type="button"
          onClick={() => openCta(meta.cta!.href)}
          data-testid="story-cta"
          className="flex h-12 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full bg-white px-5 text-sm font-semibold text-[#15131f] transition-transform active:scale-[0.98]"
        >
          <span className="truncate">{meta.cta.label}</span>
          <ChevronRight size={16} className="shrink-0" />
        </button>
      )}
      <button
        type="button"
        onClick={() => setSharing(true)}
        disabled={!meta.shareable}
        data-testid="story-share"
        aria-label={t("stories.share")}
        className={`flex h-12 items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 text-sm font-semibold text-white backdrop-blur-sm transition-transform active:scale-[0.98] disabled:opacity-40 ${
          meta.cta ? "w-12 shrink-0" : "flex-1 px-5"
        }`}
      >
        <Share2 size={meta.cta ? 18 : 16} />
        {/* Beside a page button the icon stands alone, so a long label like "Chant Hanuman Dhyana" has room. */}
        {!meta.cta && t("stories.share")}
      </button>
    </div>
  );

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-label={t("stories.open")}
          data-testid="story-viewer"
          data-story={id}
          className="fixed inset-0 z-[95] flex items-center justify-center bg-black font-body"
        >
          <motion.div
            initial={reduceMotion ? false : { scale: 0.96, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="relative h-full w-full overflow-hidden sm:aspect-[9/16] sm:h-[min(94dvh,880px)] sm:w-auto sm:rounded-[2rem] sm:border sm:border-white/10"
          >
            <motion.div
              key={id}
              initial={reduceMotion ? false : { opacity: 0.35 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
              className="h-full"
            >
              <StoryFrame mode="view" theme={meta.theme} footer={footer}>
                <Slide data={data} mode="view" />
              </StoryFrame>
            </motion.div>

            {/* Tap, hold and swipe area: everything between the header and the buttons. */}
            <div
              className="absolute inset-x-0 bottom-[calc(var(--sab)+5.5rem)] top-[calc(var(--sat)+5rem)] touch-none select-none"
              data-testid="story-tap-zone"
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
              onPointerLeave={onPointerCancel}
            />

            <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/45 to-transparent px-4 pb-6 pt-[calc(var(--sat)+0.75rem)]">
              <div className="flex gap-1.5" aria-hidden>
                {STORY_IDS.map((storyId, i) => (
                  <div key={storyId} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
                    {i < index && <div className="h-full w-full bg-white" />}
                    {i === index &&
                      (reduceMotion ? (
                        // No timer for a reader who prefers no motion: the story waits for a tap.
                        <div className="h-full w-full bg-white" />
                      ) : (
                        <div
                          key={`${storyId}-${open}`}
                          className="h-full w-full origin-left bg-white"
                          style={{
                            animation: `story-progress ${STORY_MS}ms linear forwards`,
                            animationPlayState: paused ? "paused" : "running",
                          }}
                          onAnimationEnd={next}
                        />
                      ))}
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10"
                  style={{ color: meta.theme.accent }}
                >
                  <Icon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{t(`stories.names.${id}`)}</p>
                  <p className="truncate text-xs text-white/70">
                    {t("stories.today")} • {storyDateLabel(data.now, i18n.language)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={t("common.close")}
                  data-testid="story-close"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* For keyboard and screen-reader users, who have no tap zones. */}
            <button type="button" className="sr-only" onClick={previous}>
              {t("stories.previous")}
            </button>
            <button type="button" className="sr-only" onClick={next}>
              {t("stories.next")}
            </button>

            <StoryShareSheet open={sharing} onClose={() => setSharing(false)} storyId={id} data={data} meta={meta} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
