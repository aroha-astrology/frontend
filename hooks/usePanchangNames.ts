"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNewFeature } from "@/hooks/useFeature";
import { makeNamer, type PanchangNamer } from "@/lib/panchang-names";

/** Tithi / nakshatra / paksha names for the screen: localised while lang.localNames is on, as written otherwise. */
export function usePanchangNames(): PanchangNamer {
  const { t, i18n } = useTranslation();
  const { enabled } = useNewFeature("lang.localNames");
  // i18n.language is read so the names re-render on a language change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => makeNamer((k, o) => t(k, o), enabled), [t, enabled, i18n.language]);
}
