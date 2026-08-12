"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ArrowLeft, ChevronLeft, ChevronRight, Heart, Play, Pause, AudioLines, BarChart3 } from "lucide-react";
import IconButton from "@/components/ui/IconButton";
import Card from "@/components/ui/Card";
import FeatureGuard from "@/components/FeatureGuard";
import LotusSilhouette from "@/components/LotusSilhouette";
import RudrakshaMala from "@/components/shlokas/RudrakshaMala";
import MalaBackdrop from "@/components/shlokas/MalaBackdrop";
import ShlokaTabs, { type ShlokaTab } from "@/components/shlokas/ShlokaTabs";
import { useLanguage } from "@/providers/language-provider";
import { AUDIO_BASE, loadShlokas, pick, type Shloka } from "@/lib/shlokas";
import {
  getMalaPosition,
  setMalaPosition,
  isFav,
  toggleFav,
  pushHistory,
  playShlokaAudio,
  pauseShlokaAudio,
  isShlokaAudioPlaying,
} from "@/lib/shlokas-prefs";

/**
 * The rudraksha mala screen — reproduces the reference mockup's mala screen
 * exactly (see the shlokas redesign plan's "middle part" scope). Ring
 * position = position in the 50-verse library, not repetitions of one verse
 * — replaces the old per-verse JapCounter entirely.
 */

function MantraSnippet({ shloka, lang }: { shloka: Shloka; lang: Parameters<typeof pick>[1] }) {
  return (
    <>
      <p className="font-devanagari text-sm text-foreground/90 truncate">{shloka.sanskrit.split("\n")[0]}</p>
      <p className="text-[10px] text-muted truncate">{pick(shloka.title, lang)}</p>
    </>
  );
}

function MalaScreen() {
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const router = useRouter();
  const [shlokas, setShlokas] = useState<Shloka[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [fav, setFav] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    loadShlokas().then(setShlokas).catch(() => setFailed(true));
  }, []);

  // Restore the saved reading position once the library is loaded — after
  // mount only, same reasoning JapCounter documented for its own localStorage
  // read (SSR has no localStorage; seeding useState from it directly would
  // hydrate-mismatch).
  useEffect(() => {
    if (!shlokas) return;
    const saved = getMalaPosition();
    setIndex(Number.isFinite(saved) ? Math.min(Math.max(saved, 0), shlokas.length - 1) : 0);
    setReady(true);
  }, [shlokas]);

  // Gated on `ready`, not just `shlokas` — otherwise this is truthy the
  // instant the library loads, one render before the position-restore effect
  // below corrects `index` away from its initial 0, and a returning user
  // sees mantra 1 flash before snapping to wherever they actually left off.
  const current = ready ? shlokas?.[index] : undefined;

  useEffect(() => {
    if (!ready || !current) return;
    setMalaPosition(index);
    pushHistory(current.slug);
    setFav(isFav(current.slug));
    setPlaying(false);
  }, [ready, index, current]);

  const total = shlokas?.length ?? 0;
  const isComplete = ready && total > 0 && index === total - 1;
  const pct = total > 0 ? Math.round(((index + 1) / total) * 100) : 0;
  // Wrapped, not clamped — prev of the first mantra is the last, and vice
  // versa, so the strip never has to show a dead/disabled side.
  const prevIndex = (index - 1 + total) % total;
  const nextIndex = (index + 1) % total;

  function goTo(next: number) {
    setIndex(((next % total) + total) % total);
  }
  function advance() {
    setIndex((i) => Math.min(i + 1, total - 1));
  }

  function handlePlay() {
    if (!current?.audio) return;
    if (isShlokaAudioPlaying(AUDIO_BASE + current.audio)) {
      pauseShlokaAudio();
      setPlaying(false);
      return;
    }
    playShlokaAudio(AUDIO_BASE + current.audio, () => setPlaying(false));
    setPlaying(true);
  }

  function handleTabSelect(tab: ShlokaTab) {
    if (tab === "mala") return;
    if (tab === "favorites") router.push("/shlokas?view=favorites");
    else if (tab === "history") router.push("/shlokas?view=history");
    else router.push("/shlokas");
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
          <h1 className="text-lg font-display text-foreground flex-1 truncate">{t("shlokas.malaHeading")}</h1>
        </div>

        <ShlokaTabs active="mala" onSelect={handleTabSelect} />

        {!current && !failed && <p className="text-sm text-muted text-center py-16">{t("shlokas.loading")}</p>}

        {current && (
          <>
            <div className="relative rounded-3xl overflow-hidden border border-gold/15 py-8">
              <MalaBackdrop />
              <div className="relative">
                <RudrakshaMala total={total} currentIndex={index} onTap={advance} />
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
                {current.sanskrit}
              </p>
              <p className="mt-2 text-sm text-muted text-center line-clamp-1">{current.iast.split("\n")[0]}</p>

              <LotusSilhouette className="h-4 w-4 mx-auto mt-3 text-gold" opacity={0.45} />

              <div className="mt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setFav(toggleFav(current.slug));
                  }}
                  aria-label={t(fav ? "shlokas.removeFavoriteAria" : "shlokas.addFavoriteAria")}
                  className="w-10 h-10 rounded-full border border-gold/30 flex items-center justify-center text-gold"
                >
                  <Heart size={17} className={fav ? "fill-gold" : ""} />
                </button>
                {current.audio && (
                  <>
                    <AudioLines size={18} className="text-gold/60" aria-hidden="true" />
                    <button
                      type="button"
                      onClick={handlePlay}
                      aria-label={t(playing ? "shlokas.pauseAria" : "shlokas.playAria")}
                      className="w-11 h-11 rounded-full bg-gold text-background flex items-center justify-center"
                    >
                      {playing ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                    </button>
                  </>
                )}
              </div>
            </Card>

            <div className="flex items-stretch gap-2">
              <button
                type="button"
                onClick={() => goTo(index - 1)}
                aria-label={t("shlokas.prevMantraAria")}
                className="flex-1 flex items-center gap-2 rounded-2xl border border-gold/15 bg-card p-3 text-left min-w-0"
              >
                <ChevronLeft size={18} className="text-gold shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-muted tabular-nums">
                    {prevIndex + 1} / {total}
                  </p>
                  <MantraSnippet shloka={shlokas![prevIndex]} lang={lang} />
                </div>
              </button>

              <Link
                href={`/shlokas/${current.slug}`}
                aria-label={t("shlokas.viewFullVerse")}
                className="shrink-0 w-11 h-11 rounded-full border border-gold/30 bg-card flex items-center justify-center self-center"
              >
                <LotusSilhouette className="h-5 w-5 text-gold" opacity={0.9} />
              </Link>

              <button
                type="button"
                onClick={() => goTo(index + 1)}
                aria-label={t("shlokas.nextMantraAria")}
                className="flex-1 flex items-center gap-2 rounded-2xl border border-gold/15 bg-card p-3 text-right min-w-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-muted tabular-nums">
                    {nextIndex + 1} / {total}
                  </p>
                  <MantraSnippet shloka={shlokas![nextIndex]} lang={lang} />
                </div>
                <ChevronRight size={18} className="text-gold shrink-0" />
              </button>
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
                  onClick={() => goTo(0)}
                  className="mt-3 w-full py-2.5 rounded-full bg-gold text-background text-sm font-semibold"
                >
                  {t("shlokas.startAgain")}
                </button>
              ) : (
                <p className="mt-2 text-[11px] text-muted text-center">
                  {t("shlokas.mantrasOf", { current: index + 1, total })}
                </p>
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
