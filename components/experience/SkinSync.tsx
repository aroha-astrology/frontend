"use client";

import { useEffect } from "react";
import i18n from "i18next";
import { applySkinCopy } from "@/i18n/skin-copy";
import { useNewFeature } from "@/hooks/useFeature";
import { useExperience } from "@/hooks/useExperience";
import { usePersona } from "@/hooks/usePersona";
import { useAuth } from "@/providers/auth-provider";

/** localStorage key holding the look, so the next page load can paint it before React runs. */
const SKIN_KEY = "aroha:skin";

/**
 * Runs in <head> before the first paint: puts the remembered look on <html>. Wrapped in try/catch
 * because storage can be blocked; with nothing remembered the page paints the Classic look.
 */
export const SKIN_BOOT_SCRIPT = `try{if(localStorage.getItem("${SKIN_KEY}")==="cosmic")document.documentElement.setAttribute("data-skin","cosmic")}catch(e){}`;

function applySkin(cosmic: boolean, guideName?: string | null) {
  // The labels follow the look (Today / Forecast / Ask Orion ...); a no-op when nothing changed.
  applySkinCopy(i18n, cosmic, guideName);
  try {
    const root = document.documentElement;
    if (cosmic) root.setAttribute("data-skin", "cosmic");
    else root.removeAttribute("data-skin");
    if (cosmic) localStorage.setItem(SKIN_KEY, "cosmic");
    else localStorage.removeItem(SKIN_KEY);
  } catch {
    // Storage blocked: the attribute above is still set for this visit.
  }
}

/**
 * Keeps <html data-skin> in step with the user's chosen look (switch experience.picker). Renders
 * nothing. While the switch is off, or before the user has picked, there is no data-skin and the
 * app looks exactly as it always has. Nothing is decided until the user is known, so a page load
 * never flips the look back to Classic just because the session is still loading.
 */
export default function SkinSync() {
  const { user } = useAuth();
  const { enabled } = useNewFeature("experience.picker");
  const { info } = useExperience();
  const { info: persona } = usePersona();
  // Only a Cosmic guide renames the labels; Classic guides never touch them.
  const cosmicGuide =
    persona?.look === "MODERN_COSMIC" ? (persona.options.find((o) => o.id === persona.current)?.name ?? null) : null;
  const known = Boolean(user);

  useEffect(() => {
    if (!known) return;
    if (!enabled) {
      applySkin(false);
      return;
    }
    // Enabled but the answer has not arrived yet: leave whatever the boot script painted.
    if (!info) return;
    applySkin(info.skin === "MODERN_COSMIC", cosmicGuide);
  }, [known, enabled, info, cosmicGuide]);

  return null;
}
