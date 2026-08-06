"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import IconButton from "@/components/ui/IconButton";
import Card from "@/components/ui/Card";
import FeatureGuard from "@/components/FeatureGuard";
import JapCounter from "@/components/shlokas/JapCounter";
import { useLanguage } from "@/providers/language-provider";
import { AUDIO_BASE, IMG_BASE, loadShlokas, pick, type Shloka } from "@/lib/shlokas";

/**
 * One shloka: artwork, the Devanagari verse, its IAST romanization, what it
 * means, when it is traditionally chanted, the chant audio, and a jap counter.
 *
 * The audio is a pre-rendered static MP3 — NOT lib/tts.ts. That module is the
 * device text-to-speech path for chat (native Android plugin / speechSynthesis)
 * and would read Sanskrit flat, in a Hindi voice, with no metre. These files
 * come from a one-off offline vāgdhenu render; a plain <audio> element plays
 * them. Entries without an `audio` field simply render no player.
 */

function ShlokaDetail({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const router = useRouter();
  const [shloka, setShloka] = useState<Shloka | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    loadShlokas()
      .then((all) => {
        const found = all.find((s) => s.slug === slug);
        if (found) setShloka(found);
        else setFailed(true);
      })
      .catch(() => setFailed(true));
  }, [slug]);

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
          <h1 className="text-lg font-display text-foreground flex-1 truncate">
            {shloka ? pick(shloka.title, lang) : t("shlokas.title")}
          </h1>
        </div>

        {!shloka && <p className="text-sm text-muted text-center py-16">{t("shlokas.loading")}</p>}

        {shloka && (
          <>
            {/* Portrait frame at the artwork's own 10:17 ratio, deliberately
                capped at 190px wide. The source PNGs are only ~200x340, so a
                full-bleed hero both cropped the deity's head/feet off (a 4:3
                landscape box object-cover'ing a portrait image) and upscaled a
                200px source across a ~350px viewport into visible mush. Small
                and sharp beats big and soft — do not widen this without
                higher-resolution source art. */}
            <div className="relative mx-auto w-[190px] aspect-[10/17] rounded-2xl overflow-hidden border border-gold/25 bg-gold/5 shadow-lg shadow-black/30">
              <Image
                src={IMG_BASE + shloka.img}
                alt=""
                fill
                sizes="190px"
                className="object-cover"
                priority
              />
            </div>

            <p className="text-xs text-gold/80 text-center">{pick(shloka.deity, lang)}</p>

            <Card className="p-5">
              {/* whitespace-pre-line keeps the pada breaks stored in the JSON —
                  a shloka read as one run-on line loses its metre entirely. */}
              <p className="text-lg font-display text-foreground leading-loose whitespace-pre-line text-center">
                {shloka.sanskrit}
              </p>
              <p className="mt-4 pt-4 border-t border-gold/10 text-xs text-muted italic leading-relaxed whitespace-pre-line text-center">
                {shloka.iast}
              </p>
            </Card>

            {shloka.audio && (
              <div>
                <h2 className="text-sm font-display text-gold mb-2">{t("shlokas.listen")}</h2>
                {/* Native element: native controls, native loop, native media
                    session. Nothing here needs a custom player. */}
                <audio controls loop preload="none" className="w-full" src={AUDIO_BASE + shloka.audio}>
                  {t("shlokas.audioUnsupported")}
                </audio>
              </div>
            )}

            <Card className="p-5 space-y-4">
              <div>
                <h2 className="text-sm font-display text-gold mb-1">{t("shlokas.meaning")}</h2>
                <p className="text-sm text-foreground/90 leading-relaxed">{pick(shloka.meaning, lang)}</p>
              </div>
              <div className="pt-3 border-t border-gold/10">
                <h2 className="text-sm font-display text-gold mb-1">{t("shlokas.whenToChant")}</h2>
                <p className="text-sm text-foreground/90 leading-relaxed">{pick(shloka.whenToChant, lang)}</p>
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="text-sm font-display text-gold mb-4 text-center">{t("shlokas.japCounter")}</h2>
              <JapCounter slug={shloka.slug} target={shloka.japCount} />
            </Card>

            <p className="text-[9px] text-muted/70 text-center leading-relaxed">
              {t("shlokas.disclaimer")}
            </p>
          </>
        )}
      </div>
    </main>
  );
}

export default function ShlokaDetailPage() {
  const params = useParams<{ slug: string }>();
  return (
    <FeatureGuard featureKey="nav.shlokas">
      <ShlokaDetail slug={params.slug} />
    </FeatureGuard>
  );
}
