"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import IconButton from "@/components/ui/IconButton";

export interface ReportHeroProps {
  title: string;
  onBack: () => void;
  /** Artwork cropped from a design sheet (see scripts/assets/asset-manifest.json). */
  artSrc: string;
  /** i18n key for the one-line subtitle under the report's name. */
  subtitleKey: string;
}

/**
 * The mock's illustrated header, shared by the bespoke report screens. The artwork is a
 * dark, glow-lit crop from the design sheet, so it is faded out toward the left with a
 * mask rather than sat in a hard-edged box — its own near-black background would
 * otherwise read as a visible rectangle against the card surface.
 *
 * Falls back to no artwork at all (just the title block) if the asset fails to
 * load; nothing here carries meaning, so there is no icon substitute to draw.
 */
export default function ReportHero({ title, onBack, artSrc, subtitleKey }: ReportHeroProps) {
  const { t } = useTranslation();
  const [imgError, setImgError] = useState(false);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-gold/20 bg-card">
      {!imgError && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={artSrc}
          alt=""
          aria-hidden
          onError={() => setImgError(true)}
          className="pointer-events-none absolute right-0 top-0 h-full w-auto object-cover opacity-80
                     [mask-image:linear-gradient(to_right,transparent,black_55%)]"
        />
      )}

      <div className="relative flex items-center gap-3 p-3.5">
        <IconButton onClick={onBack} aria-label={t("common.back")}>
          <ArrowLeft size={18} />
        </IconButton>
        <div className="min-w-0">
          <h1 className="font-display text-lg text-foreground truncate">{title}</h1>
          <p className="text-[11px] text-muted mt-0.5">{t(subtitleKey)}</p>
        </div>
      </div>
    </div>
  );
}
