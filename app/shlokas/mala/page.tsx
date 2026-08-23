"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ArrowLeft, Heart } from "lucide-react";
import IconButton from "@/components/ui/IconButton";
import Card from "@/components/ui/Card";
import FeatureGuard from "@/components/FeatureGuard";
import LotusSilhouette from "@/components/LotusSilhouette";
import ChantRing from "@/components/shlokas/ChantRing";
import { useLanguage } from "@/providers/language-provider";
import { AUDIO_BASE, MALA_COUNT, loadShlokas, pick, type Shloka } from "@/lib/shlokas";
import { gitaAudioUrl, loadGitaVerses, type GitaVerse } from "@/lib/gita";
import { isFav, toggleFav, pushHistory } from "@/lib/shlokas-prefs";

/**
 * Chants ONE mantra or Gita verse — chosen by the caller via `?slug=` (a
 * mantra row's chant button) or `?verse=&type=gita` (a Gita row's) — repeated
 * up to a user-editable target, seeded from that verse's own `japCount`
 * (MALA_COUNT for Gita, which carries no japCount field). This replaced an
 * earlier version that cycled through all 50 mantras to fill a fixed 108
 * count; Mala is no longer a library-browsing screen or its own nav tab, so
 * there's no ShlokaTabs bar here — just a back arrow like any detail screen.
 *
 * The ring, the counter and the audio all live in ChantRing, shared with the
 * shloka detail screen, which now carries the same counter inline.
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
  const [fav, setFav] = useState(false);

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

  useEffect(() => {
    if (!item?.slug) return;
    setFav(isFav(item.slug));
    pushHistory(item.slug);
  }, [item?.slug]);

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
            <ChantRing
              key={item.key}
              chantKey={item.key}
              sanskrit={item.sanskrit}
              audioSrc={item.audioSrc}
              defaultTarget={item.defaultTarget}
            />

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

              {item.slug && (
                <div className="mt-4 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setFav(toggleFav(item.slug!))}
                    aria-label={t(fav ? "shlokas.removeFavoriteAria" : "shlokas.addFavoriteAria")}
                    className="w-10 h-10 rounded-full border border-gold/30 flex items-center justify-center text-gold"
                  >
                    <Heart size={17} className={fav ? "fill-gold" : ""} />
                  </button>
                </div>
              )}
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
