"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { RegionId } from "@/lib/panchang/regions";

const STORAGE_KEY = "aroha:panchangRegion";

/** Default regional calendar per app language — only applies until the user picks one explicitly via RegionPicker. */
const LANGUAGE_TO_REGION: Record<string, RegionId> = {
  hi: "north",
  bn: "east",
  mr: "west",
  gu: "gujarat",
  te: "south",
  ta: "tamil",
};

/**
 * Which regional calendar to show on the Panchang page. Defaults from the
 * app's language (same as before this hook existed), but the user can
 * override via RegionPicker; the override is persisted and then wins over
 * the language default, mirroring providers/language-provider.tsx's
 * localStorage pattern (scoped to just this page, so no Context needed).
 */
export function usePanchangRegion() {
  const { i18n } = useTranslation();
  const defaultRegion = LANGUAGE_TO_REGION[i18n.language] ?? "north";
  const [region, setRegionState] = useState<RegionId>(defaultRegion);
  const [isManual, setIsManual] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(STORAGE_KEY) as RegionId | null;
    if (saved) {
      setRegionState(saved);
      setIsManual(true);
    }
  }, []);

  // Track the language default until the user manually overrides.
  useEffect(() => {
    if (!isManual) setRegionState(defaultRegion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultRegion, isManual]);

  function setRegion(id: RegionId) {
    setRegionState(id);
    setIsManual(true);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, id);
  }

  return { region, setRegion, isManual };
}
