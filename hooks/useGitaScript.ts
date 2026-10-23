"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNewFeature } from "@/hooks/useFeature";
import { targetForLanguage, transliterate, type TranslitTarget } from "@/lib/translit";

const KEY = "aroha:gita-translit";

function readHidden(): boolean {
  try {
    return localStorage.getItem(KEY) === "hidden";
  } catch {
    return false;
  }
}

/**
 * Gita transliteration (switch lang.gitaScripts): the verse in the reader's own script, or IAST for a
 * Latin-script language. Nothing for Hindi and Marathi readers. The reader can hide it; the choice is
 * remembered on this device only.
 */
export function useGitaScript(): {
  target: TranslitTarget | null;
  hidden: boolean;
  toggle: () => void;
  convert: (devanagari: string) => string;
} {
  const { i18n } = useTranslation();
  const { enabled } = useNewFeature("lang.gitaScripts");
  const [hidden, setHidden] = useState(false);

  useEffect(() => setHidden(readHidden()), []);

  const toggle = useCallback(() => {
    setHidden((h) => {
      try {
        if (h) localStorage.removeItem(KEY);
        else localStorage.setItem(KEY, "hidden");
      } catch {
        /* storage blocked: the choice lasts for this visit */
      }
      return !h;
    });
  }, []);

  const target = enabled ? targetForLanguage(i18n.language) : null;
  const convert = useCallback((text: string) => (target ? transliterate(text, target) : text), [target]);
  return { target, hidden, toggle, convert };
}
