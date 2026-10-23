"use client";

import { useTranslation } from "react-i18next";
import { useNewFeature } from "@/hooks/useFeature";
import { useSkyContext } from "@/hooks/useSkyContext";

const PLANETS = new Set(["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu"]);

/**
 * "Living outside India?" under a planet's remedy (switch experience.nriMode, and the reader said
 * they live outside India in Settings). One modern stand-in for the classic act, said to be just that.
 */
export default function DiasporaRemedy({ planet }: { planet: string }) {
  const { t } = useTranslation();
  const { enabled } = useNewFeature("experience.nriMode");
  const { ctx } = useSkyContext();
  const key = planet.toLowerCase();
  if (!enabled || !ctx?.isNri || !PLANETS.has(key)) return null;

  return (
    <div data-testid="diaspora-remedy" className="mt-2.5 rounded-xl border border-gold/20 bg-gold/5 px-3 py-2.5">
      <span className="text-[10px] uppercase tracking-wider text-gold/70">{t("diaspora.title")}</span>
      <p className="mt-1.5 text-[13px] leading-relaxed">{t(`diaspora.${key}`)}</p>
      <p className="mt-1.5 text-[11px] italic text-muted">{t("diaspora.note")}</p>
    </div>
  );
}
