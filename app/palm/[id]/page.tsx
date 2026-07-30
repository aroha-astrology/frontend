"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Lock } from "lucide-react";
import GeneratingSpinner from "@/components/ui/GeneratingSpinner";
import PalmAnnotatedView from "@/components/palm/PalmAnnotatedView";
import PalmUnlockDrawer from "@/components/palm/PalmUnlockDrawer";
import { usePalmReading } from "@/hooks/usePalmReading";
import { palmApi } from "@/lib/palm-api";
import { LINE_LABELS, MOUNT_LABELS, findMatchingSection } from "@/lib/palm/matchSection";

const SCORE_LABEL_KEY: Record<string, string> = {
  career: "palm.scores.career",
  wealth: "palm.scores.wealth",
  marriage: "palm.scores.marriage",
  health: "palm.scores.health",
  fame: "palm.scores.fame",
  spiritualGrowth: "palm.scores.spiritualGrowth",
};
const SCORE_ORDER = ["career", "wealth", "marriage", "health", "fame", "spiritualGrowth"];

export default function PalmReadingPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { state, data, failedError, retry } = usePalmReading(id, i18n.language);
  const [heroUrl, setHeroUrl] = useState<string | null>(null);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [selectedHeading, setSelectedHeading] = useState<string | null>(null);

  const isObservedOnly = data?.status === "observed";
  const isFullyReady = data?.status === "ready";

  useEffect(() => {
    if (!id || !data) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    palmApi
      .fetchFrameBlob(id, "primaryFront")
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setHeroUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setHeroUrl(null);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, data]);

  const primaryObservations = useMemo(() => {
    const obs = data?.observations as { primary?: unknown } | undefined;
    return (obs?.primary as never) ?? null;
  }, [data]);

  const handElement = (primaryObservations as { handType?: { element?: string } } | null)?.handType?.element;

  const handleSelectLine = (key: string) => setSelectedHeading(LINE_LABELS[key] ?? key);
  const handleSelectMount = (key: string) => setSelectedHeading(MOUNT_LABELS[key] ?? key);

  const matchedSection = selectedHeading ? findMatchingSection(data?.sections, selectedHeading) : null;

  const handleUnlocked = () => {
    setUnlockOpen(false);
    retry();
  };

  return (
    <main className="min-h-screen pb-tab-safe" style={{ background: "var(--background)" }}>
      <div className="px-5 pt-4 max-w-lg mx-auto space-y-5">
        {(state === "idle" || state === "loading" || state === "generating") && (
          <>
            <GeneratingSpinner label={t("palm.view.generatingTitle")} size={40} className="py-16" />
            <p className="text-xs text-muted text-center -mt-2">{t("palm.view.generatingBody")}</p>
          </>
        )}

        {state === "failed" && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <AlertTriangle className="text-amber-400" size={28} />
            <p className="text-sm text-foreground">{t("palm.view.failedTitle")}</p>
            <p className="text-xs text-muted">{t("palm.view.failedBody")}</p>
            <button type="button" onClick={() => router.push("/palm")} className="text-gold text-sm underline">
              {t("common.back")}
            </button>
          </div>
        )}

        {state === "error" && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <AlertTriangle className="text-amber-400" size={28} />
            <p className="text-sm text-foreground">{t("palm.view.errorTitle")}</p>
            <button
              type="button"
              onClick={retry}
              className="rounded-2xl bg-gold text-[#1a0e00] px-5 py-2.5 text-sm font-bold"
            >
              {t("common.checkAgain")}
            </button>
          </div>
        )}

        {state === "ready" && data && (
          <>
            <PalmAnnotatedView
              photoUrl={heroUrl}
              observations={primaryObservations}
              onSelectLine={handleSelectLine}
              onSelectMount={handleSelectMount}
            />

            <div className="flex items-center justify-between px-1">
              <span className="text-sm font-display text-gold">
                {handElement ? t(`palm.element.${handElement}`, handElement) : ""}
              </span>
              {data.confidenceScore != null && (
                <span className="text-xs text-muted">
                  {t("palm.confidence", { score: data.confidenceScore })}
                </span>
              )}
            </div>

            {matchedSection && (
              <div className="rounded-3xl border border-gold/20 bg-card p-5 space-y-2">
                <h3 className="font-display text-base text-gold">{matchedSection.heading}</h3>
                {matchedSection.paragraphs.map((p, i) => (
                  <p key={i} className="text-sm text-foreground/85 leading-relaxed">
                    {p}
                  </p>
                ))}
                <button
                  type="button"
                  onClick={() => setSelectedHeading(null)}
                  className="text-xs text-muted underline"
                >
                  {t("common.close")}
                </button>
              </div>
            )}

            {isFullyReady && data.scores && (
              <div className="rounded-3xl border border-gold/20 bg-card p-5 space-y-3">
                <p className="text-xs font-semibold text-muted uppercase tracking-wider">
                  {t("palm.scores.title")}
                </p>
                {SCORE_ORDER.map((key) => {
                  const value = (data.scores as Record<string, number>)[key] ?? 0;
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <span className="text-xs text-foreground/80 w-28 shrink-0">{t(SCORE_LABEL_KEY[key]!)}</span>
                      <div className="flex-1 h-2 rounded-full bg-surface overflow-hidden">
                        <div className="h-full bg-gold rounded-full" style={{ width: `${value * 10}%` }} />
                      </div>
                      <span className="text-xs text-gold w-5 text-right">{value}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {isFullyReady &&
              data.sections?.map((section, i) => (
                <section key={i} className="space-y-2">
                  <h2 className="font-display text-base text-gold mb-1">{section.heading}</h2>
                  {section.paragraphs.map((p, j) => (
                    <p key={j} className="text-sm text-foreground/85 leading-relaxed">
                      {p}
                    </p>
                  ))}
                </section>
              ))}

            {isFullyReady && data.synthesis && (
              <div className="rounded-3xl border border-gold/20 bg-card p-5 space-y-2">
                <p className="text-xs font-semibold text-muted uppercase tracking-wider">
                  {t("palm.synthesis.title")}
                </p>
                {typeof (data.synthesis as Record<string, unknown>).alignmentScore === "number" && (
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1 h-2 rounded-full bg-surface overflow-hidden">
                      <div
                        className="h-full bg-gold rounded-full"
                        style={{ width: `${(data.synthesis as Record<string, number>).alignmentScore}%` }}
                      />
                    </div>
                    <span className="text-xs text-gold">
                      {(data.synthesis as Record<string, number>).alignmentScore}%
                    </span>
                  </div>
                )}
                {["karmicShift", "freeWillExpression", "panditMessage"].map((k) => {
                  const v = (data.synthesis as Record<string, unknown>)[k];
                  return typeof v === "string" ? (
                    <p key={k} className="text-sm text-foreground/85 leading-relaxed">
                      {v}
                    </p>
                  ) : null;
                })}
              </div>
            )}

            {isObservedOnly && (
              <div className="rounded-3xl border border-gold/30 bg-card p-5 text-center space-y-3">
                <Lock className="mx-auto text-gold" size={22} />
                <p className="text-sm text-foreground font-medium">{t("palm.teaser.title")}</p>
                <p className="text-xs text-muted leading-relaxed">{t("palm.teaser.body")}</p>
                <button
                  type="button"
                  onClick={() => setUnlockOpen(true)}
                  className="w-full rounded-2xl bg-gold text-[#1a0e00] px-4 py-3 text-sm font-bold"
                >
                  {t("palm.teaser.cta")}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {unlockOpen && id && (
        <PalmUnlockDrawer readingId={id} onClose={() => setUnlockOpen(false)} onUnlocked={handleUnlocked} />
      )}
    </main>
  );
}
