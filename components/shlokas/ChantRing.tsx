"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BarChart3, Pause, Play } from "lucide-react";
import Card from "@/components/ui/Card";
import RudrakshaMala from "@/components/shlokas/RudrakshaMala";
import MalaBackdrop from "@/components/shlokas/MalaBackdrop";
import {
  getJapProgress,
  setJapProgress,
  playShlokaAudio,
  pauseShlokaAudio,
  isShlokaAudioPlaying,
} from "@/lib/shlokas-prefs";

/**
 * The chant ring + its progress card, extracted out of app/shlokas/mala so
 * the shloka detail screen can carry the same counter inline under its
 * artwork instead of sending the user to a second screen for it. Both
 * callers get one shared jap position, keyed by `chantKey` in localStorage.
 *
 * The play/pause button lives here rather than on either caller's verse card
 * because it shares the bead's audio lock: while a chant is sounding the
 * bead can't be tapped again, and that one `locked` flag drives both.
 */

interface Props {
  /** localStorage key for this verse's saved position, e.g. its slug or `gita:<id>`. */
  chantKey: string;
  /** Devanagari verse — its first line shows in the ring centre while audio plays. */
  sanskrit: string;
  audioSrc: string | null;
  /** Traditional repetition count for this verse; the user can edit the target. */
  defaultTarget: number;
}

export default function ChantRing({ chantKey, sanskrit, audioSrc, defaultTarget }: Props) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [target, setTarget] = useState(defaultTarget);
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);

  // Restore saved progress after mount only — SSR has no localStorage, so
  // seeding useState from it directly would hydrate-mismatch.
  useEffect(() => {
    const saved = getJapProgress(chantKey, defaultTarget);
    setTarget(saved.target);
    setIndex(Math.min(Math.max(saved.index, 0), saved.target - 1));
    setReady(true);
  }, [chantKey, defaultTarget]);

  const total = target;
  const isComplete = ready && total > 0 && index === total - 1;
  const pct = total > 0 ? Math.round(((index + 1) / total) * 100) : 0;

  // Advance and pronounce are one bundled action; the bead can't be tapped
  // again until this chant's audio finishes.
  function advanceAndPlay() {
    if (locked || total === 0) return;
    const nextIndex = Math.min(index + 1, total - 1);
    if (nextIndex === index) return; // already at the last chant
    navigator.vibrate?.(20);
    setIndex(nextIndex);
    setJapProgress(chantKey, { index: nextIndex, target });
    if (audioSrc) {
      setLocked(true);
      playShlokaAudio(audioSrc, () => setLocked(false));
    }
  }

  function playCurrent() {
    if (!audioSrc) return;
    if (isShlokaAudioPlaying(audioSrc)) {
      pauseShlokaAudio();
      setLocked(false);
      return;
    }
    setLocked(true);
    playShlokaAudio(audioSrc, () => setLocked(false));
  }

  function resetToZero() {
    pauseShlokaAudio();
    setLocked(false);
    setIndex(0);
    setJapProgress(chantKey, { index: 0, target });
  }

  function updateTarget(next: number) {
    const clamped = Math.min(Math.max(Math.round(next) || 1, 1), 1008);
    const clampedIndex = Math.min(index, clamped - 1);
    setTarget(clamped);
    setIndex(clampedIndex);
    setJapProgress(chantKey, { index: clampedIndex, target: clamped });
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
