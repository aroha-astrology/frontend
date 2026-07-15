"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import Card from "./Card";
import { useAuth } from "@/providers/auth-provider";
import { api, type GemstoneItem, type GemstoneStrength } from "@/lib/api";
import { useGemstone } from "@/hooks/useGemstone";

const UNLOCK_COST = 10;

/** A small faceted-gem SVG tinted in the stone's colour — used as the per-stone "image". */
function GemVisual({ color, size = 46 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-hidden="true" className="shrink-0">
      <defs>
        <linearGradient id={`gem-${color.replace("#", "")}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="35%" stopColor={color} stopOpacity="0.95" />
          <stop offset="100%" stopColor={color} stopOpacity="0.7" />
        </linearGradient>
      </defs>
      {/* Crown + pavilion faceted gem */}
      <polygon points="24,3 40,15 24,45 8,15" fill={`url(#gem-${color.replace("#", "")})`}
        stroke={color} strokeWidth="1" strokeOpacity="0.7" />
      <polygon points="8,15 40,15 24,45" fill={color} fillOpacity="0.25" />
      <polygon points="24,3 40,15 24,15 8,15" fill="#ffffff" fillOpacity="0.18" />
      <line x1="24" y1="15" x2="24" y2="45" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="0.6" />
      <line x1="8" y1="15" x2="40" y2="15" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="0.6" />
    </svg>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] font-semibold tracking-[0.25em] uppercase text-gold mb-3 flex items-center gap-2">
      <span className="text-gold text-xs">💎</span>
      {children}
      <span className="h-px flex-1 bg-gradient-to-r from-gold/30 to-transparent" />
    </h3>
  );
}

const STRENGTH_STYLES: Record<GemstoneStrength, string> = {
  weak: "text-red-400 bg-red-500/10 border-red-500/20",
  average: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  strong: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
};

/** Fallback % for reports cached before preferencePercent existed. */
const STRENGTH_FALLBACK_PCT: Record<GemstoneStrength, number> = { weak: 80, average: 45, strong: 20 };

/** A compact conic-gradient ring showing how strongly the stone is preferred. */
function PreferenceRing({ pct }: { pct: number }) {
  const { t } = useTranslation();
  const color = pct >= 66 ? "#34d399" : pct >= 40 ? "#fbbf24" : "#9ca3af";
  return (
    <div className="shrink-0 flex flex-col items-center gap-0.5">
      <div
        className="w-11 h-11 rounded-full grid place-items-center"
        style={{ background: `conic-gradient(${color} ${pct * 3.6}deg, rgba(120,120,120,0.18) 0deg)` }}
      >
        <div className="w-8 h-8 rounded-full bg-card grid place-items-center">
          <span className="text-[11px] font-bold text-foreground">{pct}%</span>
        </div>
      </div>
      <span className="text-[8px] uppercase tracking-wider text-muted">{t("kundli.gemstone.suited")}</span>
    </div>
  );
}

function GemRow({ gem }: { gem: GemstoneItem }) {
  const { t } = useTranslation();
  const facts: { label: string; value: string }[] = [
    { label: t("kundli.gemstone.alternatives"), value: gem.alternativeStones.join(", ") },
    { label: t("kundli.gemstone.finger"), value: gem.finger },
    { label: t("kundli.gemstone.metal"), value: gem.metal },
    { label: t("kundli.gemstone.dayToWear"), value: gem.dayToWear },
    { label: t("kundli.gemstone.weight"), value: gem.weightCarats },
  ];

  return (
    <div className={`rounded-2xl border p-3.5 ${gem.recommended ? "border-gold/25 bg-gold/[0.04]" : "border-border bg-surface/40"}`}>
      <div className="flex items-start gap-3">
        <GemVisual color={gem.color} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-foreground">{gem.gemstone}</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-semibold uppercase tracking-wider ${STRENGTH_STYLES[gem.strength]}`}>
              {t(`kundli.gemstone.strength.${gem.strength}`)}
            </span>
            {gem.recommended && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-gold/30 text-gold bg-gold/10 font-semibold uppercase tracking-wider">
                {t("kundli.gemstone.recommendedTag")}
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted mt-0.5">
            {t("kundli.gemstone.forPlanet", { planet: gem.planet })}
          </p>
          {gem.note && <p className="text-xs text-foreground/90 mt-2 leading-relaxed">{gem.note}</p>}
        </div>
        <PreferenceRing pct={gem.preferencePercent ?? STRENGTH_FALLBACK_PCT[gem.strength]} />
      </div>

      {/* Facts */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-3">
        {facts.map(({ label, value }) => (
          <div key={label} className="flex flex-col">
            <span className="text-[9px] text-muted uppercase tracking-wider">{label}</span>
            <span className="text-[11px] text-foreground font-medium">{value}</span>
          </div>
        ))}
      </div>

      {/* Mantra */}
      <div className="mt-3 rounded-xl bg-gold/[0.06] border border-gold/15 p-2.5">
        <p className="text-[9px] font-semibold text-muted uppercase tracking-wider mb-0.5">
          {t("kundli.gemstone.mantra")}
        </p>
        <p className="text-xs text-gold font-medium italic">{gem.mantra}</p>
        <p className="text-[10px] text-muted mt-0.5">
          {t("kundli.gemstone.mantraCount", { times: gem.mantraCount.toLocaleString() })}
        </p>
      </div>

      {/* Do's / Don'ts */}
      <div className="grid sm:grid-cols-2 gap-3 mt-3">
        <div>
          <p className="text-[10px] font-semibold text-emerald-400 mb-1">{t("kundli.gemstone.dos")}</p>
          <ul className="space-y-1">
            {gem.dos.map((d, i) => (
              <li key={i} className="flex gap-1.5 text-[10px] text-muted leading-snug">
                <span className="text-emerald-400 shrink-0">+</span>{d}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-red-400 mb-1">{t("kundli.gemstone.donts")}</p>
          <ul className="space-y-1">
            {gem.donts.map((d, i) => (
              <li key={i} className="flex gap-1.5 text-[10px] text-muted leading-snug">
                <span className="text-red-400 shrink-0">−</span>{d}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function GemstoneCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, refresh } = useAuth();
  const credits = user?.credits ?? 0;
  const unlocked = user?.gemstoneUnlocked ?? false;
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  const { state, data } = useGemstone(unlocked);

  // Recommended stones first, then the rest — preserves within-group order.
  const gems = useMemo(() => {
    if (!data?.gems) return [];
    return [...data.gems].sort((a, b) => Number(b.recommended) - Number(a.recommended));
  }, [data]);

  const handleUnlock = async () => {
    if (credits < UNLOCK_COST) {
      router.push("/payment");
      return;
    }
    setUnlocking(true);
    setUnlockError(null);
    try {
      await api.unlockGemstone();
      await refresh();
    } catch {
      setUnlockError(t("kundli.gemstone.unlockError"));
    } finally {
      setUnlocking(false);
    }
  };

  // ── Locked ──────────────────────────────────────────────────────────────
  if (!unlocked) {
    const canAfford = credits >= UNLOCK_COST;
    return (
      <Card className="p-4">
        <Heading>{t("kundli.gemstone.title")}</Heading>

        {/* Blurred teaser row of gems */}
        <div className="relative mb-4">
          <div className="flex justify-center gap-3 blur-[3px] opacity-70 select-none pointer-events-none">
            {["#ef4444", "#e2e8f0", "#22c55e", "#eab308", "#3b82f6"].map((c) => (
              <GemVisual key={c} color={c} size={40} />
            ))}
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl">🔒</span>
          </div>
        </div>

        <p className="text-xs text-muted text-center leading-relaxed mb-4">
          {t("kundli.gemstone.lockedBody")}
        </p>

        <button
          onClick={handleUnlock}
          disabled={unlocking}
          className="w-full h-12 rounded-2xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold text-sm disabled:opacity-50 transition-opacity"
        >
          {unlocking
            ? t("kundli.gemstone.unlocking")
            : canAfford
              ? t("kundli.gemstone.unlockButton", { cost: UNLOCK_COST })
              : t("kundli.gemstone.buyCredits")}
        </button>
        {!canAfford && (
          <p className="text-[10px] text-muted text-center mt-2">
            {t("kundli.gemstone.notEnough", { cost: UNLOCK_COST })}
          </p>
        )}
        {unlockError && <p className="text-[11px] text-red-400 text-center mt-2">{unlockError}</p>}
        <p className="text-[9px] text-muted/70 text-center mt-3 leading-relaxed">
          {t("kundli.gemstone.disclaimer")}
        </p>
      </Card>
    );
  }

  // ── Unlocked ────────────────────────────────────────────────────────────
  return (
    <Card className="p-4">
      <Heading>{t("kundli.gemstone.title")}</Heading>

      {(state === "loading" || state === "generating") && (
        <div className="py-8 flex flex-col items-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
            className="w-8 h-8 rounded-full border-2 border-gold border-t-transparent"
          />
          <p className="text-xs text-muted mt-3">{t("kundli.gemstone.generating")}</p>
        </div>
      )}

      {state === "error" && (
        <p className="text-xs text-red-400 text-center py-6">{t("kundli.gemstone.error")}</p>
      )}

      {state === "ready" && data && (
        <>
          {data.intro && (
            <p className="text-xs text-foreground/90 leading-relaxed mb-4">{data.intro}</p>
          )}
          <div className="space-y-3">
            {gems.map((gem) => (
              <GemRow key={gem.planet} gem={gem} />
            ))}
          </div>
          <p className="text-[9px] text-muted/70 text-center mt-4 leading-relaxed">
            {t("kundli.gemstone.disclaimer")}
          </p>
        </>
      )}
    </Card>
  );
}
