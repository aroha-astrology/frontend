"use client";

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useKundli } from "@/hooks/useKundli";
import Card from "@/components/ui/Card";
import type { Kundli } from "@/lib/api";

const PLANET_EMOJI: Record<string, string> = {
  Sun: "☀️", Moon: "🌙", Mars: "♂️", Mercury: "☿️",
  Jupiter: "♃", Venus: "♀️", Saturn: "♄", Rahu: "🐉", Ketu: "🔥",
};

function PlanetPill({ name, sign }: { name: string; sign: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gold/15 bg-surface/50 text-xs">
      <span>{PLANET_EMOJI[name] ?? "🪐"}</span>
      <span className="text-foreground font-medium">{name}</span>
      <span className="text-muted">{sign}</span>
    </div>
  );
}

function SkeletonKundli() {
  return (
    <Card className="p-5 border-gold/10 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-gold/10" />
        <div className="space-y-1.5 flex-1">
          <div className="h-4 w-32 rounded bg-gold/10" />
          <div className="h-3 w-48 rounded bg-gold/5" />
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-8 w-24 rounded-full bg-gold/5" />
        ))}
      </div>
    </Card>
  );
}

function extractChartInfo(kundli: Kundli) {
  const chart = kundli.chart as Record<string, unknown> | null;
  if (!chart) return { ascendant: null, planets: [] };

  const asc = chart.ascendant as Record<string, unknown> | undefined;
  const ascendantSign = (asc?.ascendantSign ?? asc?.sign ?? null) as string | null;

  const rawPlanets = (chart.planets ?? []) as Array<Record<string, unknown>>;
  const planets = rawPlanets.map((p) => ({
    planet: String(p.planet ?? ""),
    sign: String(p.sign ?? ""),
    house: Number(p.house ?? 0),
    nakshatra: String(p.nakshatra ?? ""),
    isRetrograde: Boolean(p.isRetrograde),
  }));

  return { ascendant: ascendantSign, planets };
}

function extractDashaInfo(kundli: Kundli) {
  const dasha = kundli.dasha as Record<string, unknown> | null;
  if (!dasha) return null;

  const maha = dasha.currentMahadasha as Record<string, unknown> | undefined;
  const antar = dasha.currentAntardasha as Record<string, unknown> | undefined;

  if (!maha) return null;
  return {
    mahadasha: String(maha.planet ?? ""),
    antardasha: antar ? String(antar.planet ?? "") : null,
  };
}

export default function KundliSummary() {
  const { t } = useTranslation();
  const { kundli, loading, error } = useKundli();

  if (loading) return <SkeletonKundli />;
  if (error || !kundli) return null;

  const { ascendant, planets } = extractChartInfo(kundli);
  const dashaInfo = extractDashaInfo(kundli);
  const keyPlanets = planets.slice(0, 5);

  return (
    <Card
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 border-gold/10 relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-24 h-24 bg-gold/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border border-gold/40 flex items-center justify-center text-lg text-gold">
            📜
          </div>
          <div>
            <h3 className="text-base font-display text-foreground tracking-wide">
              {t("kundli.yourKundli")}
            </h3>
            {ascendant && (
              <p className="text-xs text-muted">
                {t("kundli.ascendant")}: <span className="text-gold font-medium">{ascendant}</span>
              </p>
            )}
          </div>
        </div>
        {dashaInfo && (
          <div className="text-right">
            <p className="text-[10px] text-muted uppercase tracking-wider">{t("kundli.dasha")}</p>
            <p className="text-xs text-gold font-medium">{dashaInfo.mahadasha}</p>
            {dashaInfo.antardasha && (
              <p className="text-[10px] text-muted">/ {dashaInfo.antardasha}</p>
            )}
          </div>
        )}
      </div>

      {keyPlanets.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex gap-2 flex-wrap"
        >
          {keyPlanets.map((p) => (
            <PlanetPill key={p.planet} name={p.planet} sign={p.sign} />
          ))}
          {planets.length > 5 && (
            <div className="flex items-center px-3 py-1.5 rounded-full border border-gold/10 text-xs text-muted">
              +{planets.length - 5}
            </div>
          )}
        </motion.div>
      )}
    </Card>
  );
}
