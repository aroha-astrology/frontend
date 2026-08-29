"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { BarChart3, Pause, Play } from "lucide-react";
import Card from "@/components/ui/Card";
import RudrakshaMala from "@/components/shlokas/RudrakshaMala";
import MalaBackdrop from "@/components/shlokas/MalaBackdrop";
import { getJapProgress, setJapProgress, playShlokaAudio, pauseShlokaAudio } from "@/lib/shlokas-prefs";

/**
 * The chant ring + its progress card, extracted out of app/shlokas/mala so
 * the shloka detail screen can carry the same counter inline under its
 * artwork instead of sending the user to a second screen for it. Both
 * callers get one shared jap position, keyed by `chantKey` in localStorage.
 *
 * The play/pause button runs the WHOLE mala: one press auto-advances and
 * chants every remaining repetition up to `target`, pausing GAP_MS between
 * each, until it completes or the user presses pause again. It shares the
 * bead's audio lock with manual tapping — while the auto-run is active
 * (playing OR in its gap) the bead can't be tapped, and that one `locked`
 * flag drives both.
 */

/** Pause between one chant ending and the next starting, during an auto-run. */
const GAP_MS = 2000;

interface Props {
  /** localStorage key for this verse's saved position, e.g. its slug or `gita:<id>`. */
  chantKey: string;
  /** Devanagari verse — its first line shows in the ring centre while audio plays. */
  sanskrit: string;
  audioSrc: string | null;
  /** Traditional repetition count for this verse; the user can edit the target. */
  defaultTarget: number;
  /** Wins over the saved target on mount — how an AI-picked count (e.g. the
   *  horoscope remedy) reaches the ring. The saved index still restores,
   *  clamped to this target. */
  targetOverride?: number;
}

export default function ChantRing({ chantKey, sanskrit, audioSrc, defaultTarget, targetOverride }: Props) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [target, setTarget] = useState(defaultTarget);
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);

  // Mirrors of index/target for the auto-run's callbacks below, which fire
  // from a setTimeout/audio "ended" event well after the render that
  // scheduled them — reading React state there would see whatever was
  // current AT SCHEDULING TIME, not the latest. Refs are mutable containers
  // read at CALL time, so they always see the latest value.
  const indexRef = useRef(0);
  const targetRef = useRef(defaultTarget);
  // Whether an auto-run is currently armed (playing or between chants in its
  // gap) — separate from `locked` because it must also be readable/writable
  // from inside those same stale-closure-prone callbacks.
  const autoRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function stopAuto() {
    autoRef.current = false;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pauseShlokaAudio();
    setLocked(false);
  }

  // Restore saved progress after mount only — SSR has no localStorage, so
  // seeding useState from it directly would hydrate-mismatch. Also stops any
  // in-flight auto-run: chantKey/targetOverride can change without a full
  // remount (the mala screen forces one via `key`, but other callers don't).
  useEffect(() => {
    stopAuto();
    const saved = getJapProgress(chantKey, defaultTarget);
    const initialTarget = targetOverride ?? saved.target;
    const initialIndex = Math.min(Math.max(saved.index, 0), initialTarget - 1);
    targetRef.current = initialTarget;
    indexRef.current = initialIndex;
    setTarget(initialTarget);
    setIndex(initialIndex);
    setReady(true);
  }, [chantKey, defaultTarget, targetOverride]);

  // Auto-run must not keep chanting into an unmounted screen (navigating
  // away mid-gap would otherwise leave a live timer + a shared audio element
  // still playing).
  useEffect(() => {
    return stopAuto;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = target;
  const isComplete = ready && total > 0 && index === total - 1;
  const pct = total > 0 ? Math.round(((index + 1) / total) * 100) : 0;

  /** Updates index state + its ref + persistence together — the single
   *  source of truth advanceAndPlay/resetToZero/updateTarget/the auto-run
   *  all commit through, so they can never drift from each other. */
  function commitIndex(next: number) {
    indexRef.current = next;
    setIndex(next);
    setJapProgress(chantKey, { index: next, target: targetRef.current });
  }

  // Advance and pronounce are one bundled action; the bead can't be tapped
  // again until this chant's audio finishes. Untouched by the auto-run above
  // other than reusing commitIndex — a single tap still plays exactly one
  // clip, same as before.
  function advanceAndPlay() {
    if (locked || total === 0) return;
    const nextIndex = Math.min(index + 1, total - 1);
    if (nextIndex === index) return; // already at the last chant
    navigator.vibrate?.(20);
    commitIndex(nextIndex);
    if (audioSrc) {
      setLocked(true);
      playShlokaAudio(audioSrc, () => setLocked(false));
    }
  }

  /** Plays the CURRENT index's clip, then — unlike a bead tap — keeps going:
   *  waits GAP_MS, advances, plays the next, and so on until `target` is
   *  reached. `locked` stays true for the whole run (gaps included) so a
   *  bead tap can't interleave with it; pressing this button again cancels. */
  function chantNext() {
    if (!audioSrc) return;
    playShlokaAudio(audioSrc, () => {
      if (!autoRef.current) return; // paused/cancelled while this clip played
      if (indexRef.current >= targetRef.current - 1) {
        stopAuto(); // reached the target — mala complete
        return;
      }
      timerRef.current = setTimeout(() => {
        if (!autoRef.current) return; // cancelled during the gap
        commitIndex(indexRef.current + 1);
        chantNext();
      }, GAP_MS);
    });
  }

  function playCurrent() {
    if (!audioSrc) return;
    if (autoRef.current) {
      stopAuto();
      return;
    }
    autoRef.current = true;
    setLocked(true);
    chantNext();
  }

  function resetToZero() {
    stopAuto();
    commitIndex(0);
  }

  function updateTarget(next: number) {
    const clamped = Math.min(Math.max(Math.round(next) || 1, 1), 1008);
    targetRef.current = clamped;
    setTarget(clamped);
    commitIndex(Math.min(index, clamped - 1));
  }

  return (
    <div className="space-y-4">
      <div className="relative rounded-3xl overflow-hidden border border-gold/15 pt-8 pb-4">
        <MalaBackdrop />
        <div className="relative">
          <RudrakshaMala
            total={total}
            currentIndex={index}
            onTap={advanceAndPlay}
            locked={locked}
            mantraSnippet={sanskrit.split("\n")[0]}
          />
        </div>
      </div>

      <Card className="p-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-background/60 border border-gold/20 flex items-center justify-center text-gold shrink-0">
            <BarChart3 size={16} />
          </div>
          <div className="flex-1 flex items-baseline justify-between">
            <span className="text-sm font-semibold text-foreground">
              {isComplete ? t("shlokas.malaComplete") : t("shlokas.yourProgress")}
            </span>
            {!isComplete && (
              <span className="text-xs text-gold font-medium">{t("shlokas.percentCompleted", { n: pct })}</span>
            )}
          </div>
          {audioSrc && (
            <button
              type="button"
              onClick={playCurrent}
              aria-label={t(locked ? "shlokas.pauseAria" : "shlokas.playAria")}
              className="w-10 h-10 rounded-full bg-gold text-background flex items-center justify-center shrink-0"
            >
              {locked ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
            </button>
          )}
        </div>
        <div className="mt-3 h-2 rounded-full bg-gold/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold-light to-gold transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        {isComplete ? (
          <button
            type="button"
            onClick={resetToZero}
            className="mt-3 w-full py-2.5 rounded-full bg-gold text-background text-sm font-semibold"
          >
            {t("shlokas.startAgain")}
          </button>
        ) : (
          <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-muted">
            <span className="tabular-nums">{index + 1}</span>
            <span>/</span>
            <input
              type="number"
              min={1}
              max={1008}
              value={target}
              onChange={(e) => updateTarget(Number(e.target.value))}
              aria-label={t("shlokas.chantCountAria")}
              className="w-12 bg-transparent border-b border-gold/30 text-center text-gold font-semibold tabular-nums focus:outline-none"
            />
          </div>
        )}
      </Card>
    </div>
  );
}
