"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Download, Hexagon, Lock } from "lucide-react";
import ParticleBackground from "@/components/ParticleBackground";
import IconButton from "@/components/ui/IconButton";
import Card from "@/components/ui/Card";
import NewFeatureGuard from "@/components/NewFeatureGuard";
import FactorList from "@/components/why/FactorList";
import { ApiError } from "@/lib/api";
import { formatRupees } from "@/lib/format";
import { isNativeAndroid } from "@/lib/play-billing";
import { ImageSaver, yantraApi, type DigitalKind, type YantraView } from "@/lib/yantra-api";
import { mantraInScript, svgToPngDataUrl, wallpaperSvg, yantraSvg } from "@/lib/yantra-draw";
import { useAuth } from "@/providers/auth-provider";

type LoadError = "notReady" | "error";

function YantraPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { refresh } = useAuth();
  const [view, setView] = useState<YantraView | null>(null);
  const [loadError, setLoadError] = useState<LoadError | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<"funds" | "failed" | null>(null);
  const [saved, setSaved] = useState(false);
  // An Android app build without the gallery saver (1.12 and older) can't save the images.
  const [oldApp, setOldApp] = useState(false);
  const lang = i18n.language;

  useEffect(() => {
    void isNativeAndroid().then(async (android) => {
      if (!android) return;
      const { Capacitor } = await import("@capacitor/core");
      setOldApp(!Capacitor.isPluginAvailable("ImageSaver"));
    });
    yantraApi
      .get()
      .then(setView)
      .catch((err: unknown) =>
        setLoadError(err instanceof ApiError && err.message === "CHART_NOT_READY" ? "notReady" : "error"),
      );
  }, []);

  const spec = view?.spec ?? null;
  const planetName = view ? t(`planetNames.${view.preview.planet.toLowerCase()}`) : "";
  const title = t("yantra.name", { planet: planetName });
  const mantra = spec ? mantraInScript(spec.mantra.devanagari, lang) : "";
  const affirmation = spec ? t(spec.affirmationKey) : "";
  const nakshatraLine = view
    ? t("yantra.nakshatra", { nakshatra: t(`nakshatraNames.${view.preview.nakshatra.toLowerCase()}`) })
    : "";
  const inlineSvg = useMemo(() => (spec ? yantraSvg(spec, 600) : null), [spec]);

  async function buy(kind: DigitalKind) {
    setBusy(true);
    setError(null);
    try {
      setView(await yantraApi.buy(kind));
      void refresh();
    } catch (err) {
      setError(err instanceof ApiError && err.message === "INSUFFICIENT_CREDITS" ? "funds" : "failed");
    } finally {
      setBusy(false);
    }
  }

  async function download(kind: DigitalKind) {
    if (!spec) return;
    setSaved(false);
    const [svg, w, h] =
      kind === "yantra"
        ? [yantraSvg(spec, 2048), 2048, 2048]
        : [
            wallpaperSvg(spec, {
              title,
              mantra,
              mantraIast: spec.mantra.iast,
              nakshatra: nakshatraLine,
              affirmation,
            }),
            1080,
            2340,
          ];
    const fileName = `aroha-${spec.planet.toLowerCase()}-${kind}.png`;
    try {
      const png = await svgToPngDataUrl(svg, w, h);
      if (await isNativeAndroid()) {
        try {
          await ImageSaver.savePng({ base64: png, fileName });
          setSaved(true);
          return;
        } catch {
          // Older Android (or an older app build): open the image to long-press and save.
          window.open(png, "_blank");
          return;
        }
      }
      const a = document.createElement("a");
      a.href = png;
      a.download = fileName;
      a.click();
    } catch {
      setError("failed");
    }
  }

  return (
    <main className="cosmic-bg min-h-screen pb-tab-safe relative overflow-hidden text-foreground">
      <ParticleBackground />
      <div className="relative z-10 px-5 pt-8 max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <IconButton onClick={() => router.back()} aria-label={t("common.back")}>
            <ArrowLeft size={18} />
          </IconButton>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-display flex items-center gap-2">
              <Hexagon size={18} className="text-gold" />
              {t("yantra.title")}
            </h1>
            <p className="text-[11px] text-muted">{t("yantra.subtitle")}</p>
          </div>
        </div>

        {loadError && <p className="py-10 text-center text-sm text-muted">{t(`yantra.${loadError}`)}</p>}
        {!loadError && !view && <p className="py-10 text-center text-sm text-muted">{t("yantra.loading")}</p>}

        {view && (
          <>
            <Card className="p-4 border-gold/20 space-y-3" data-testid="yantra-card">
              <div className="flex items-center gap-3">
                <span
                  className="h-10 w-10 shrink-0 rounded-full border"
                  style={{ background: view.preview.colours.primary, borderColor: view.preview.colours.accent }}
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="text-base font-semibold text-gold">{title}</p>
                  <p className="text-[11px] text-muted">{nakshatraLine}</p>
                </div>
              </div>
              <FactorList factors={view.preview.why} />

              {inlineSvg ? (
                <div
                  className="mx-auto w-full max-w-xs overflow-hidden rounded-2xl"
                  data-testid="yantra-drawing"
                  // Generated from numbers and colour codes only — no user text goes in.
                  dangerouslySetInnerHTML={{ __html: inlineSvg.replace(/width="600" height="600"/, 'width="100%" height="100%"') }}
                />
              ) : (
                <p className="flex items-center gap-2 text-sm text-foreground/85">
                  <Lock size={14} className="text-gold" />
                  {t("yantra.locked")}
                </p>
              )}
              {spec && <p className="text-center text-[11px] text-muted">{t("yantra.sum", { sum: spec.magicSum })}</p>}
            </Card>

            {spec && (
              <Card className="p-4 border-gold/10 space-y-2" data-testid="yantra-mantra">
                <p className="text-xs font-semibold uppercase tracking-wider text-gold">{t("yantra.mantra")}</p>
                <p className="text-lg text-foreground">{mantra}</p>
                <p className="text-xs italic text-muted">{spec.mantra.iast}</p>
                <p className="text-[11px] text-muted">{t("yantra.chant")}</p>
                <p className="pt-2 text-xs font-semibold uppercase tracking-wider text-gold">{t("yantra.affirmationTitle")}</p>
                <p className="text-sm text-foreground/90">{affirmation}</p>
              </Card>
            )}

            <div className="space-y-2 pb-4">
              {(["yantra", "wallpaper"] as const).map((kind) =>
                view.owned[kind] ? (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => void download(kind)}
                    className="flex w-full h-12 items-center justify-center gap-2 rounded-full border border-gold/40 text-sm font-semibold text-gold"
                  >
                    <Download size={16} />
                    {t(kind === "yantra" ? "yantra.downloadYantra" : "yantra.downloadWallpaper")}
                  </button>
                ) : view.prices[kind] != null && !oldApp ? (
                  <button
                    key={kind}
                    type="button"
                    disabled={busy}
                    onClick={() => void buy(kind)}
                    className="w-full h-12 rounded-full bg-yellow-500 text-black text-sm font-semibold disabled:opacity-40"
                  >
                    {t(kind === "yantra" ? "yantra.buyYantra" : "yantra.buyWallpaper", {
                      price: formatRupees(view.prices[kind]!),
                    })}
                  </button>
                ) : null,
              )}
              {oldApp && <p className="text-center text-xs text-muted">{t("yantra.updateApp")}</p>}
              {saved && <p className="text-center text-xs text-emerald-400">{t("yantra.saved")}</p>}
              {error && (
                <p className="text-center text-xs text-rose-300">
                  {t(error === "funds" ? "yantra.funds" : "yantra.failed")}{" "}
                  {error === "funds" && (
                    <Link href="/payment" className="font-semibold text-gold underline">
                      {t("yantra.addMoney")}
                    </Link>
                  )}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function YantraRoute() {
  return (
    <NewFeatureGuard featureKey="nav.digitalYantra">
      <YantraPage />
    </NewFeatureGuard>
  );
}
