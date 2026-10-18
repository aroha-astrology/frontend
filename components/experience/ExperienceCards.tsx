"use client";

import { useTranslation } from "react-i18next";
import { SKIN_OPTIONS, type ExperienceSkin } from "@/lib/experience";

/** The display name of a look, in the user's language. */
export function useSkinName() {
  const { t } = useTranslation();
  return (skin: ExperienceSkin) => t(skin === "CLASSIC_VEDIC" ? "experience.classic.name" : "experience.cosmic.name");
}

/**
 * The two looks as tappable cards. The suggested one is marked but never chosen for the user: they
 * always tap. `current` marks the look they already have (Settings).
 */
export default function ExperienceCards({
  suggested,
  current,
  disabled,
  onPick,
}: {
  suggested?: ExperienceSkin;
  current?: ExperienceSkin | null;
  disabled?: boolean;
  onPick: (skin: ExperienceSkin) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-3" data-testid="experience-cards">
      {SKIN_OPTIONS.map(({ skin, emoji }) => {
        const key = skin === "CLASSIC_VEDIC" ? "classic" : "cosmic";
        const isSuggested = suggested === skin;
        return (
          <button
            key={skin}
            type="button"
            data-testid={`experience-card-${skin}`}
            disabled={disabled}
            onClick={() => onPick(skin)}
            className={`text-left rounded-2xl border px-4 py-3.5 transition-all active:scale-[0.98] disabled:opacity-50 ${
              isSuggested ? "border-gold/60 bg-gold/10" : "border-gold/20 bg-card/80 hover:border-gold/50"
            }`}
          >
            <div className="flex items-center gap-2">
              <span aria-hidden className="text-lg">
                {emoji}
              </span>
              <span className="text-[15px] font-medium text-foreground">{t(`experience.${key}.name`)}</span>
              {isSuggested && (
                <span className="ml-auto rounded-full bg-gold/20 px-2 py-0.5 text-[10px] text-gold">
                  {t("experience.suggested")}
                </span>
              )}
              {current === skin && (
                <span className="ml-auto rounded-full border border-border px-2 py-0.5 text-[10px] text-muted">✓</span>
              )}
            </div>
            <p className="mt-1.5 text-[12.5px] leading-snug text-muted">{t(`experience.${key}.desc`)}</p>
          </button>
        );
      })}
    </div>
  );
}
