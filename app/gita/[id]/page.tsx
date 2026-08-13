"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import IconButton from "@/components/ui/IconButton";
import Card from "@/components/ui/Card";
import FeatureGuard from "@/components/FeatureGuard";
import { CATEGORY_GLOSS, TAG_GLOSS, gitaAudioUrl, loadGitaVerses, type GitaVerse } from "@/lib/gita";

/**
 * One Gita verse: Devanagari text, its category + need-tags, and chant audio.
 * Deliberately simpler than the Shlokas detail page — no per-language fields
 * (this content is Sanskrit-only by design, see lib/gita.ts), no image (no
 * per-verse artwork exists for 701 verses), no jap counter (not requested for
 * this feature). Audio streams from the backend (gitaAudioUrl), not a
 * frontend public/ asset — see gita.routes.ts on the backend for why.
 */

function GitaDetail({ id }: { id: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [verse, setVerse] = useState<GitaVerse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    loadGitaVerses()
      .then((all) => {
        const found = all.find((v) => v.id === id);
        if (found) setVerse(found);
        else setFailed(true);
      })
      .catch(() => setFailed(true));
  }, [id]);

  if (failed) {
    return (
      <main className="min-h-screen pb-tab-safe" style={{ background: "var(--background)" }}>
        <div className="flex flex-col items-center text-center gap-3 py-24 px-5">
          <AlertTriangle size={28} className="text-red-400" />
          <p className="text-sm text-muted max-w-xs">{t("gita.loadError")}</p>
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
            {verse ? `${verse.chapter}.${verse.verse}` : t("gita.title")}
          </h1>
        </div>

        {!verse && <p className="text-sm text-muted text-center py-16">{t("gita.loading")}</p>}

        {verse && (
          <>
            <p className="text-xs text-gold/80 text-center">
              {verse.mainCategory}
              {CATEGORY_GLOSS[verse.mainCategory] && ` (${CATEGORY_GLOSS[verse.mainCategory]})`}
            </p>

            <Card className="p-5">
              <p className="text-lg font-display text-foreground leading-loose whitespace-pre-line text-center">
                {verse.sanskrit}
              </p>
            </Card>

            <div>
              <h2 className="text-sm font-display text-gold mb-2">{t("gita.listen")}</h2>
              <audio controls loop preload="none" className="w-full" src={gitaAudioUrl(verse.id)}>
                {t("gita.audioUnsupported")}
              </audio>
            </div>

            {verse.tags.length > 0 && (
              <Card className="p-5">
                <h2 className="text-sm font-display text-gold mb-3">{t("gita.forSituations")}</h2>
                <div className="flex flex-wrap gap-2">
                  {verse.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1.5 rounded-full text-xs border border-gold/20 text-foreground/90"
                    >
                      {TAG_GLOSS[tag] ?? tag}
                      <span className="text-muted"> ({tag})</span>
                    </span>
                  ))}
                </div>
              </Card>
            )}

            <p className="text-[9px] text-muted/70 text-center leading-relaxed">{t("gita.disclaimer")}</p>
          </>
        )}
      </div>
    </main>
  );
}

export default function GitaDetailPage() {
  const params = useParams<{ id: string }>();
  return (
    <FeatureGuard featureKey="nav.gita">
      <GitaDetail id={params.id} />
    </FeatureGuard>
  );
}
