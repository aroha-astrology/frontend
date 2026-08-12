"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ArrowLeft, Play, Pause, Heart } from "lucide-react";
import IconButton from "@/components/ui/IconButton";
import SegmentedToggle from "@/components/ui/SegmentedToggle";
import LanguagePicker from "@/components/LanguagePicker";
import FeatureGuard from "@/components/FeatureGuard";
import ShlokaTabs, { type ShlokaTab } from "@/components/shlokas/ShlokaTabs";
import { tagMeta } from "@/components/shlokas/tag-meta";
import { useLanguage } from "@/providers/language-provider";
import { AUDIO_BASE, loadShlokas, pick, type Shloka } from "@/lib/shlokas";
import { getFavs, toggleFav, getHistory, playShlokaAudio, pauseShlokaAudio, isShlokaAudioPlaying } from "@/lib/shlokas-prefs";

/**
 * The Shlokas & Japs library — reproduces the reference mockup's list screen
 * (numbered rows, category chips, tag pills, play + heart) exactly. Free: no
 * unlock, no credit check, no wallet call anywhere on this route. Reachable
 * from the Home card (`home.shlokas`) and gated as a page by `nav.shlokas`.
 *
 * Doubles as the Favorites and History views (`activeTab`) rather than
 * separate routes — both are just different orderings/filters of the same
 * 50-entry list, so a second page would duplicate this whole file for no
 * real difference. `?view=favorites|history` seeds the initial tab when
 * arriving from the mala screen's tab bar.
 */

type SortMode = "default" | "az";
/** "all" and "favorites" sit alongside the data-driven tag chips in one single-select row. */
type ChipFilter = "all" | "favorites" | string;

function ShlokaRow({
  shloka,
  fav,
  playing,
  onToggleFav,
  onTogglePlay,
}: {
  shloka: Shloka;
  fav: boolean;
  playing: boolean;
  onToggleFav: () => void;
  onTogglePlay: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-gold/15 bg-card p-4 flex gap-3">
      <div className="w-7 h-7 rounded-full border border-gold/30 flex items-center justify-center text-[11px] text-gold font-medium shrink-0 mt-0.5">
        {shloka.id}
      </div>

      <Link href={`/shlokas/${shloka.slug}`} className="min-w-0 flex-1">
        <p className="font-devanagari text-base text-foreground truncate">{shloka.sanskrit.split("\n")[0]}</p>
        <p className="text-xs text-muted truncate mt-0.5">{shloka.iast.split("\n")[0]}</p>
        <div className="flex gap-1.5 mt-2">
          {shloka.tags.slice(0, 2).map((tag) => {
            const meta = tagMeta(tag);
            const Icon = meta.icon;
            return (
              <span
                key={tag}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${meta.pill}`}
              >
                <Icon size={10} />
                {t(`shlokas.tags.${tag}`)}
              </span>
            );
          })}
        </div>
      </Link>

      <div className="flex flex-col items-center gap-2 shrink-0">
        {shloka.audio && (
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={t(playing ? "shlokas.pauseAria" : "shlokas.playAria")}
            className="w-9 h-9 rounded-full border border-gold/30 flex items-center justify-center text-gold"
          >
            {playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
          </button>
        )}
        <button
          type="button"
          onClick={onToggleFav}
          aria-label={t(fav ? "shlokas.removeFavoriteAria" : "shlokas.addFavoriteAria")}
          className="w-9 h-9 flex items-center justify-center text-gold"
        >
          <Heart size={17} className={fav ? "fill-gold" : ""} />
        </button>
      </div>
    </div>
  );
}

function ShlokasLibrary() {
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [shlokas, setShlokas] = useState<Shloka[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [activeTab, setActiveTab] = useState<ShlokaTab>("mantras");
  const [chipFilter, setChipFilter] = useState<ChipFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [playingSlug, setPlayingSlug] = useState<string | null>(null);

  useEffect(() => {
    loadShlokas().then(setShlokas).catch(() => setFailed(true));
    setFavs(new Set(getFavs()));
    const view = searchParams.get("view");
    if (view === "favorites" || view === "history") setActiveTab(view);
    // Seed once from the entry URL only — not a two-way binding after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tagsPresent = useMemo(() => {
    if (!shlokas) return [];
    return [...new Set(shlokas.flatMap((s) => s.tags))];
  }, [shlokas]);

  const visible = useMemo(() => {
    if (!shlokas) return [];
    let list: Shloka[];
    if (activeTab === "favorites") {
      list = shlokas.filter((s) => favs.has(s.slug));
    } else if (activeTab === "history") {
      const order = getHistory();
      list = order.map((slug) => shlokas.find((s) => s.slug === slug)).filter((s): s is Shloka => !!s);
    } else if (chipFilter === "all") {
      list = shlokas;
    } else if (chipFilter === "favorites") {
      list = shlokas.filter((s) => favs.has(s.slug));
    } else {
      list = shlokas.filter((s) => s.tags.includes(chipFilter));
    }
    if (activeTab === "mantras" && sortMode === "az") {
      list = [...list].sort((a, b) => pick(a.title, lang).localeCompare(pick(b.title, lang)));
    }
    return list;
  }, [shlokas, activeTab, chipFilter, favs, sortMode, lang]);

  function handleToggleFav(slug: string) {
    toggleFav(slug);
    setFavs(new Set(getFavs()));
  }

  function handleTogglePlay(shloka: Shloka) {
    if (!shloka.audio) return;
    const src = AUDIO_BASE + shloka.audio;
    if (isShlokaAudioPlaying(src)) {
      pauseShlokaAudio();
      setPlayingSlug(null);
      return;
    }
    playShlokaAudio(src, () => setPlayingSlug(null));
    setPlayingSlug(shloka.slug);
  }

  function handleTabSelect(tab: ShlokaTab) {
    if (tab === "mala") {
      router.push("/shlokas/mala");
      return;
    }
    setActiveTab(tab);
  }

  const emptyCopy =
    activeTab === "favorites" && visible.length === 0
      ? t("shlokas.noFavorites")
      : activeTab === "history" && visible.length === 0
        ? t("shlokas.noHistory")
        : null;

  return (
    <main className="min-h-screen pb-tab-safe" style={{ background: "var(--background)" }}>
      <div className="px-5 pt-4 max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <IconButton onClick={() => router.back()} aria-label={t("common.back")}>
            <ArrowLeft size={18} />
          </IconButton>
          <h1 className="text-lg font-display text-foreground flex-1 truncate">{t("shlokas.title")}</h1>
        </div>

        <ShlokaTabs active={activeTab} onSelect={handleTabSelect} />

        {failed && (
          <div className="flex flex-col items-center text-center gap-3 py-16">
            <AlertTriangle size={28} className="text-red-400" />
            <p className="text-sm text-muted max-w-xs">{t("shlokas.loadError")}</p>
          </div>
        )}

        {!shlokas && !failed && <p className="text-sm text-muted text-center py-16">{t("shlokas.loading")}</p>}

        {shlokas && (
          <>
            <div>
              <h2 className="text-xl font-display text-foreground">{t("shlokas.listTitle")}</h2>
              <p className="text-xs text-muted mt-1">{t("shlokas.desc")}</p>
            </div>

            {activeTab === "mantras" && (
              <>
                <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1 scrollbar-hide">
                  <button
                    type="button"
                    onClick={() => setChipFilter("all")}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs border transition-colors ${
                      chipFilter === "all" ? "border-gold bg-gold/10 text-gold" : "border-gold/20 text-muted hover:border-gold/40"
                    }`}
                  >
                    {t("shlokas.allTags")}
                  </button>
                  {tagsPresent.map((tag) => {
                    const meta = tagMeta(tag);
                    const Icon = meta.icon;
                    const active = chipFilter === tag;
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setChipFilter(tag)}
                        className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-colors ${
                          active ? meta.pill : "border-gold/20 text-muted hover:border-gold/40"
                        }`}
                      >
                        <Icon size={12} />
                        {t(`shlokas.tags.${tag}`)}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setChipFilter("favorites")}
                    className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-colors ${
                      chipFilter === "favorites" ? "border-rose-500/30 bg-rose-500/10 text-rose-500" : "border-gold/20 text-muted hover:border-gold/40"
                    }`}
                  >
                    <Heart size={12} className={chipFilter === "favorites" ? "fill-rose-500" : ""} />
                    {t("shlokas.favorites")}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3 text-xs">
                  <SegmentedToggle
                    value={sortMode}
                    onChange={setSortMode}
                    options={[
                      { value: "default", label: t("shlokas.sortDefault") },
                      { value: "az", label: t("shlokas.sortAz") },
                    ]}
                  />
                  <div className="flex items-center gap-2 text-muted shrink-0">
                    <LanguagePicker align="right" />
                    <span className="tabular-nums">{t("shlokas.count", { n: visible.length })}</span>
                  </div>
                </div>
              </>
            )}

            {emptyCopy && <p className="text-sm text-muted text-center py-12">{emptyCopy}</p>}

            <div className="space-y-3">
              {visible.map((s) => (
                <ShlokaRow
                  key={s.slug}
                  shloka={s}
                  fav={favs.has(s.slug)}
                  playing={playingSlug === s.slug}
                  onToggleFav={() => handleToggleFav(s.slug)}
                  onTogglePlay={() => handleTogglePlay(s)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function ShlokasPage() {
  return (
    <FeatureGuard featureKey="nav.shlokas">
      <ShlokasLibrary />
    </FeatureGuard>
  );
}
