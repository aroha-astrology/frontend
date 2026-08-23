"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ArrowLeft, Heart, Play, Pause, AudioLines, BarChart3 } from "lucide-react";
import IconButton from "@/components/ui/IconButton";
import Card from "@/components/ui/Card";
import FeatureGuard from "@/components/FeatureGuard";
import LotusSilhouette from "@/components/LotusSilhouette";
import RudrakshaMala from "@/components/shlokas/RudrakshaMala";
import MalaBackdrop from "@/components/shlokas/MalaBackdrop";
import { useLanguage } from "@/providers/language-provider";
import { AUDIO_BASE, MALA_COUNT, loadShlokas, pick, type Shloka } from "@/lib/shlokas";
import { gitaAudioUrl, loadGitaVerses, type GitaVerse } from "@/lib/gita";
import {
  getJapProgress,
  setJapProgress,
  isFav,
  toggleFav,
  pushHistory,
  playShlokaAudio,
  pauseShlokaAudio,
  isShlokaAudioPlaying,
} from "@/lib/shlokas-prefs";

/**
 * Chants ONE mantra or Gita verse — chosen by the caller via `?slug=` (a
 * mantra row's chant button) or `?verse=&type=gita` (a Gita row's) — repeated
 * up to a user-editable target, seeded from that verse's own `japCount`
 * (MALA_COUNT for Gita, which carries no japCount field). This replaced an
 * earlier version that cycled through all 50 mantras to fill a fixed 108
 * count; Mala is no longer a library-browsing screen or its own nav tab, so
 * there's no ShlokaTabs bar here — just a back arrow like any detail screen.
 */

interface ChantItem {
  key: string;
  sanskrit: string;
  iast?: string;
  subtitle: string;
  audioSrc: string | null;
  defaultTarget: number;
  slug?: string;
  detailHref: string;
}

function MalaScreen() {
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug");
  const verseId = searchParams.get("verse");
  const isGita = searchParams.get("type") === "gita" && !!verseId;

  const [shlokas, setShlokas] = useState<Shloka[] | null>(null);
  const [gitaVerses, setGitaVerses] = useState<GitaVerse[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [index, setIndex] = useState(0);
  const [target, setTarget] = useState(MALA_COUNT);
  const [ready, setReady] = useState(false);
  const [fav, setFav] = useState(false);
  // True while the current audio is playing. Doubles as the ring bead's
  // tap-lock and the card's play/pause icon.
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (!slug && !isGita) {
      router.replace("/shlokas");
      return;
    }
    if (isGita) {
      loadGitaVerses().then(setGitaVerses).catch(() => setFailed(true));
    } else {
      loadShlokas().then(setShlokas).catch(() => setFailed(true));
    }
  }, [slug, isGita, router]);

  const item: ChantItem | null = useMemo(() => {
    if (isGita) {
      const v = gitaVerses?.find((g) => g.id === verseId);
      if (!v) return null;
      return {
        key: `gita:${v.id}`,
        sanskrit: v.sanskrit,
        subtitle: `${t("gita.title")} ${v.chapter}.${v.verse}`,
        audioSrc: gitaAudioUrl(v.id),
        defaultTarget: MALA_COUNT,
        detailHref: `/gita/${v.id}`,
      };
    }
    const s = shlokas?.find((x) => x.slug === slug);
    if (!s) return null;
    return {
      key: s.slug,
      sanskrit: s.sanskrit,
      iast: s.iast,
      subtitle: pick(s.title, lang),
      audioSrc: s.audio ? AUDIO_BASE + s.audio : null,
      defaultTarget: s.japCount || MALA_COUNT,
      slug: s.slug,
      detailHref: `/shlokas/${s.slug}`,
    };
  }, [isGita, gitaVerses, shlokas, verseId, slug, lang, t]);

  // Restore saved progress/target once the item is known — after mount only
  // (SSR has no localStorage; seeding useState from it directly would
  // hydrate-mismatch).
  useEffect(() => {
    if (!item) return;
    const saved = getJapProgress(item.key, item.defaultTarget);
    setTarget(saved.target);
    setIndex(Math.min(Math.max(saved.index, 0), saved.target - 1));
    setReady(true);
    if (item.slug) {
      setFav(isFav(item.slug));
      pushHistory(item.slug);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.key]);

  const total = item ? target : 0;
  const isComplete = ready && total > 0 && index === total - 1;
  const pct = total > 0 ? Math.round(((index + 1) / total) * 100) : 0;

  // The bead's own tap handler: advance and pronounce are one bundled
  // action, and the bead can't be tapped again until this chant's audio
  // finishes.
  function advanceAndPlay() {
    if (locked || !item || total === 0) return;
    const nextIndex = Math.min(index + 1, total - 1);
    if (nextIndex === index) return; // already at the last chant
    navigator.vibrate?.(20);
    setIndex(nextIndex);
    setJapProgress(item.key, { index: nextIndex, target });
    if (item.audioSrc) {
      setLocked(true);
      playShlokaAudio(item.audioSrc, () => setLocked(false));
    }
  }

  // The card's own play button — replays the current audio on demand,
  // independent of advancing. Shares the same lock so the ring bead
  // correctly shows as un-tappable while this is playing too.
  function playCurrent() {
    if (!item?.audioSrc) return;
    if (isShlokaAudioPlaying(item.audioSrc)) {
      pauseShlokaAudio();
      setLocked(false);
      return;
    }
    setLocked(true);
    playShlokaAudio(item.audioSrc, () => setLocked(false));
  }

  function resetToZero() {
    pauseShlokaAudio();
    setLocked(false);
    setIndex(0);
    if (item) setJapProgress(item.key, { index: 0, target });
  }

  function updateTarget(next: number) {
    const clamped = Math.min(Math.max(Math.round(next) || 1, 1), 1008);
    const clampedIndex = Math.min(index, clamped - 1);
    setTarget(clamped);
    setIndex(clampedIndex);
    if (item) setJapProgress(item.key, { index: clampedIndex, target: clamped });
  }

  if (failed) {
    return (
      <main className="min-h-screen pb-tab-safe" style={{ background: "var(--background)" }}>
        <div className="flex flex-col items-center text-center gap-3 py-24 px-5">
          <AlertTriangle size={28} className="text-red-400" />
          <p className="text-sm text-muted max-w-xs">{t("shlokas.loadError")}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-tab-safe" style={{ background: "var(--background)" }}>
      <div className="px-5 pt-4 max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <IconButton onClick={() => router.back()} aria-label={t("common.back")}>
            <ArrowLeft size={18} />
          </IconButton>
          <h1 className="text-lg font-display text-foreground flex-1 truncate">{t("shlokas.tabs.mantras")}</h1>
        </div>

        {!item && !failed && <p className="text-sm text-muted text-center py-16">{t("shlokas.loading")}</p>}

        {item && (
          <>
            <div className="relative rounded-3xl overflow-hidden border border-gold/15 pt-8 pb-4">
              <MalaBackdrop />
              <div className="relative">
                <RudrakshaMala
                  total={total}
                  currentIndex={index}
                  onTap={advanceAndPlay}
                  locked={locked}
                  mantraSnippet={item.sanskrit.split("\n")[0]}
                />
              </div>
            </div>

            <Card className="p-5 relative">
              <div className="flex items-center justify-center gap-2">
                <span className="h-px w-6 bg-gold/30" />
                <span className="text-[11px] tracking-wide text-gold font-medium uppercase">
                  {t("shlokas.currentMantra")}
                </span>
                <span className="h-px w-6 bg-gold/30" />
              </div>

              <p className="mt-3 font-devanagari text-2xl text-foreground text-center leading-relaxed line-clamp-3 whitespace-pre-line">
                {item.sanskrit}
              </p>
              <p className="mt-2 text-sm text-muted text-center line-clamp-1">
                {item.iast ? item.iast.split("\n")[0] : item.subtitle}
              </p>

              <LotusSilhouette className="h-4 w-4 mx-auto mt-3 text-gold" opacity={0.45} />

              <div className="mt-4 flex items-center justify-end gap-3">
                {item.slug && (
                  <button
                    type="button"
                    onClick={() => setFav(toggleFav(item.slug!))}
                    aria-label={t(fav ? "shlokas.removeFavoriteAria" : "shlokas.addFavoriteAria")}
                    className="w-10 h-10 rounded-full border border-gold/30 flex items-center justify-center text-gold"
                  >
                    <Heart size={17} className={fav ? "fill-gold" : ""} />
                  </button>
                )}
                {item.audioSrc && (
                  <>
                    <AudioLines size={18} className="text-gold/60" aria-hidden="true" />
                    <button
                      type="button"
                      onClick={playCurrent}
                      aria-label={t(locked ? "shlokas.pauseAria" : "shlokas.playAria")}
                      className="w-11 h-11 rounded-full bg-gold text-background flex items-center justify-center"
                    >
                      {locked ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                    </button>
                  </>
                )}
              </div>
            </Card>

            <div className="flex justify-center">
              <Link
                href={item.detailHref}
                className="flex items-center gap-2 px-4 h-11 rounded-full border border-gold/30 bg-card text-sm text-gold font-medium"
              >
                <LotusSilhouette className="h-4 w-4 text-gold" opacity={0.9} />
                {t("shlokas.viewFullVerse")}
              </Link>
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
          </>
        )}
      </div>
    </main>
  );
}

export default function MalaPage() {
  return (
    <FeatureGuard featureKey="nav.shlokas">
      <MalaScreen />
    </FeatureGuard>
  );
}
