"use client";

import { useTranslation } from "react-i18next";
import { useGitaScript } from "@/hooks/useGitaScript";

/**
 * The transliteration line(s) under a Gita verse (switch lang.gitaScripts). Draws nothing when the
 * switch is off or the reader already reads Devanagari. `toggle` adds the show/hide control, used on
 * the chant screen; the list rows just follow the saved choice.
 */
export default function GitaTranslit({
  lines,
  toggle = false,
  className = "",
}: {
  lines: string[];
  toggle?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const { target, hidden, toggle: flip, convert } = useGitaScript();
  if (!target) return null;

  return (
    <div className={className} data-testid="gita-translit" data-script={target}>
      {!hidden && (
        <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/85" lang={target === "iast" ? "sa-Latn" : undefined}>
          {lines.map(convert).join("\n")}
        </p>
      )}
      {toggle && (
        <button
          type="button"
          data-testid="gita-translit-toggle"
          onClick={flip}
          className="mt-1 text-[11px] text-gold underline-offset-2 hover:underline"
        >
          {hidden ? t("gita.translit.show") : t("gita.translit.hide")}
        </button>
      )}
    </div>
  );
}
