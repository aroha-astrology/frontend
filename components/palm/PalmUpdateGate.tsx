"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowDownToLine } from "lucide-react";
import { PLAY_STORE_URL } from "@/lib/app-review";
import { installedAndroidBuild, palmNeedsUpdate } from "@/lib/app-update";

/**
 * Palmistry needs the latest Android build (owner, 2026-10-24): whenever someone opens it, the
 * installed build is checked first, and an older one is asked to update from Play before it can
 * do anything. The Android app loads the live site, so this check runs in every installed build,
 * old ones included. The web and iOS are never blocked.
 *
 * "checking" is a blink on the web and a beat in the app (reading the installed build); the page
 * shows nothing meanwhile so a blocked reader never sees the screen they are about to lose.
 */
export type PalmBuildGate = "checking" | "ok" | "update";

export function usePalmBuildGate(): PalmBuildGate {
  const [gate, setGate] = useState<PalmBuildGate>("checking");
  useEffect(() => {
    let cancelled = false;
    void installedAndroidBuild().then((build) => {
      if (!cancelled) setGate(palmNeedsUpdate(build) ? "update" : "ok");
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return gate;
}

/** The whole screen a reader on an old build sees instead of Palmistry. */
export function PalmUpdateNotice() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-5 px-8 text-center"
      style={{ background: "var(--background)" }}
      data-testid="palm-update-gate"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-gold">
        <ArrowDownToLine size={28} />
      </div>
      <div className="max-w-xs space-y-2">
        <h1 className="font-display text-xl text-foreground">{t("palm.update.title")}</h1>
        <p className="text-sm leading-relaxed text-muted">{t("palm.update.body")}</p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-2">
        <button
          type="button"
          data-testid="palm-update-cta"
          onClick={() => window.open(PLAY_STORE_URL, "_blank")}
          className="w-full rounded-2xl bg-gold px-4 py-3 text-sm font-bold text-[#1a0e00]"
        >
          {t("palm.update.cta")}
        </button>
        <button type="button" onClick={() => router.back()} className="text-xs text-muted underline underline-offset-4">
          {t("palm.update.back")}
        </button>
      </div>
    </main>
  );
}
