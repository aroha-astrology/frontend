"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Calendar } from "lucide-react";
import type { DashaReading } from "@/lib/api";
import { PLANET_EMOJI } from "./types";

type ViewMode = "plain" | "technical";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  } catch {
    return iso;
  }
}

/**
 * The dasha reading is a different timescale than the daily/weekly/monthly/
 * yearly narrative above it (a Mahadasha spans years), so it gets its own
 * small Plain/Technical toggle rather than living inside the period toggle —
 * same visual language as ForecastDetailModal's toggle, scoped to just this
 * block.
 */
export default function DashaChapterCard({ dasha }: { dasha: DashaReading }) {
  const { t } = useTranslation();
  const [view, setView] = useState<ViewMode>("plain");

  return (
    <div className="bg-surface/40 border border-gold/10 rounded-xl p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 text-gold text-xs font-medium uppercase tracking-wider">
          <span>{PLANET_EMOJI[dasha.mahadashaPlanet] ?? "🪐"}</span>
          {t("horoscope.dasha.title")}
        </div>
        <div className="flex rounded-lg border border-gold/15 p-0.5 bg-surface/60 shrink-0">
          {(["plain", "technical"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setView(mode)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-semibold whitespace-nowrap transition-colors ${
                view === mode ? "bg-gold text-[#1a0e00]" : "text-muted"
              }`}
            >
              {t(`horoscope.toggle.${mode}`)}
            </button>
          ))}
        </div>
      </div>

      {view === "plain" ? (
        <div className="space-y-1.5">
          <p className="text-sm text-foreground font-medium leading-snug">{dasha.hook}</p>
          <p className="text-xs text-foreground/75 leading-relaxed">{dasha.meaning}</p>
        </div>
      ) : (
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted text-xs">{t("horoscope.dasha.mahadasha")}</span>
            <span className="text-foreground font-medium">{dasha.mahadashaPlanet}</span>
          </div>
          {dasha.antardashaPlanet && (
            <div className="flex items-center justify-between">
              <span className="text-muted text-xs">{t("horoscope.dasha.antardasha")}</span>
              <span className="text-foreground font-medium">{dasha.antardashaPlanet}</span>
            </div>
          )}
          {dasha.activeUntil && (
            <div className="flex items-center gap-1.5 text-xs text-muted pt-1 border-t border-gold/10">
              <Calendar size={12} />
              {t("horoscope.dasha.activeUntil", { date: formatDate(dasha.activeUntil) })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
