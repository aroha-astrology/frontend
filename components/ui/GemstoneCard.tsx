"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { ChevronRight, Scale } from "lucide-react";
import Card from "./Card";
import BottomSheetModal from "./BottomSheetModal";
import { useAuth } from "@/providers/auth-provider";
import { api, type GemstoneItem, type GemstoneStrength } from "@/lib/api";
import { useGemstone } from "@/hooks/useGemstone";
import { useFeature } from "@/hooks/useFeature";
import { purgeUserCache } from "@/lib/cache";

import { formatRupees } from "@/lib/format";

const MIN_WEIGHT_KG = 20;
const MAX_WEIGHT_KG = 300;

/**
 * One-time prompt shown right before the gemstone unlock charge goes through
 * — captures body weight (kg), which the backend uses to compute a
 * recommended gemstone carat weight (see recommendedGemstoneCarats,
 * astro-engine/gemstones.ts) and stores for reuse elsewhere. Optional: a
 * user can skip and unlock without it, just without a carat recommendation.
 */
function GemstoneWeightSheet({
  onSubmit,
  onClose,
  submitting,
}: {
  /** Called with a validated weight, or undefined if the user skips. */
  onSubmit: (weightKg: number | undefined) => void;
  onClose: () => void;
  submitting: boolean;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState("");
  const parsed = Number(value);
  const valid = value.trim() !== "" && Number.isFinite(parsed) && parsed >= MIN_WEIGHT_KG && parsed <= MAX_WEIGHT_KG;

  return (
    <BottomSheetModal
      onClose={onClose}
      closeLabel={t("common.close")}
      header={
        <h2 className="flex items-center gap-2 text-base font-semibold text-gold">
          <Scale size={18} />
          {t("kundli.gemstone.weightPromptTitle")}
        </h2>
      }
    >
      <p className="text-sm leading-relaxed text-muted mb-4">
        {t("kundli.gemstone.weightPromptBody")}
      </p>

      <div className="flex items-center gap-2 mb-4">
        <input
          type="number"
          inputMode="decimal"
          min={MIN_WEIGHT_KG}
          max={MAX_WEIGHT_KG}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t("kundli.gemstone.weightPlaceholder")}
          className="flex-1 h-12 rounded-xl border border-gold/20 bg-surface px-4 text-sm text-foreground outline-none focus:border-gold/50"
        />
        <span className="text-sm text-muted">{t("kundli.gemstone.weightUnit")}</span>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => valid && onSubmit(parsed)}
          disabled={!valid || submitting}
          className="flex-1 h-11 rounded-full bg-yellow-500 text-black text-sm font-semibold disabled:opacity-50"
        >
          {t("kundli.gemstone.weightContinue")}
        </button>
        <button
          onClick={() => onSubmit(undefined)}
          disabled={submitting}
          className="flex-1 h-11 rounded-full border text-sm disabled:opacity-50"
          style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
        >
          {t("kundli.gemstone.weightSkip")}
        </button>
      </div>
    </BottomSheetModal>
  );
}

/** Faceted-gem SVG tinted in the stone's colour — the fallback when no photo is available. */
function GemGlyph({ color, size }: { color: string; size: number }) {
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

/**
 * Per-stone visual. Renders the real gemstone photo at /gemstones/<planet>.png
 * when a planet is given; falls back to the tinted faceted-gem glyph if there's
 * no planet (locked teaser) or the image fails to load.
 */
export function GemVisual({ color, planet, size = 46 }: { color: string; planet?: string; size?: number }) {
  const [imgError, setImgError] = useState(false);
  if (planet && !imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/gemstones/${planet.toLowerCase()}.png`}
        alt=""
        width={size}
        height={size}
        onError={() => setImgError(true)}
        className="shrink-0 rounded-xl object-contain"
        style={{ width: size, height: size, background: `${color}14` }}
      />
    );
  }
  return <GemGlyph color={color} size={size} />;
}

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

export function GemRow({ gem }: { gem: GemstoneItem }) {
  const { t } = useTranslation();
  const [showCareDetails, setShowCareDetails] = useState(false);
  const dataKey = (field: string) => `kundli.gemstone.data.${gem.planet}.${field}`;
  const displayName = t(dataKey("displayName"));
  const gemName = t(dataKey("gemName"));
  const alternatives = t(dataKey("alternatives"), { returnObjects: true }) as string[];
  const dos = t(dataKey("dos"), { returnObjects: true }) as string[];
  const staticDonts = t(dataKey("donts"), { returnObjects: true }) as string[];
  const donts = gem.conditionalCautionApplies
    ? [...staticDonts, t(dataKey("conditionalDont"))]
    : staticDonts;
  const verifyTips = t(dataKey("howToVerify"), { returnObjects: true }) as string[];
  const originCountry = t(dataKey("originCountry"));

  const facts: { label: string; value: string }[] = [
    { label: t("kundli.gemstone.alternatives"), value: alternatives.join(", ") },
    { label: t("kundli.gemstone.finger"), value: t(dataKey("finger")) },
    { label: t("kundli.gemstone.metal"), value: t(dataKey("metal")) },
    { label: t("kundli.gemstone.dayToWear"), value: t(dataKey("dayToWear")) },
    { label: t("kundli.gemstone.weight"), value: t(dataKey("weightCarats")) },
  ];

  return (
    <div className={`rounded-2xl border p-3.5 ${gem.recommended ? "border-gold/25 bg-gold/[0.04]" : "border-border bg-surface/40"}`}>
      <div className="flex items-start gap-3">
        <GemVisual color={gem.color} planet={gem.planet} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-foreground">{gemName}</span>
          </div>
          <p className="text-[11px] text-muted mt-0.5">
            {t("kundli.gemstone.forPlanet", { planet: displayName })}
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
          {t("kundli.gemstone.mantraCount", { times: gem.mantraPerDay, days: gem.mantraDays })}
        </p>
      </div>

      {/* Do's / Don'ts + Verify Authenticity — collapsed by default, since
          stacking all of this for every gem makes the card very long. */}
      <button
        type="button"
        onClick={() => setShowCareDetails((v) => !v)}
        className="mt-3 text-[11px] text-gold underline-offset-2 hover:underline"
      >
        {showCareDetails ? t("kundli.gemstone.hideCareDetails") : t("kundli.gemstone.showCareDetails")}
      </button>

      {showCareDetails && (
        <>
          <div className="grid sm:grid-cols-2 gap-3 mt-3">
            <div>
              <p className="text-[10px] font-semibold text-emerald-400 mb-1">{t("kundli.gemstone.dos")}</p>
              <ul className="space-y-1">
                {dos.map((d, i) => (
                  <li key={i} className="flex gap-1.5 text-[10px] text-muted leading-snug">
                    <span className="text-emerald-400 shrink-0">+</span>{d}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-red-400 mb-1">{t("kundli.gemstone.donts")}</p>
              <ul className="space-y-1">
                {donts.map((d, i) => (
                  <li key={i} className="flex gap-1.5 text-[10px] text-muted leading-snug">
                    <span className="text-red-400 shrink-0">−</span>{d}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-[10px] font-semibold text-sky-400 mb-1">{t("kundli.gemstone.verifyAuthenticity")}</p>
            <ul className="space-y-1">
              {verifyTips.map((v, i) => (
                <li key={i} className="flex gap-1.5 text-[10px] text-muted leading-snug">
                  <span className="text-sky-400 shrink-0">✓</span>{v}
                </li>
              ))}
            </ul>
            <p className="text-[10px] text-muted mt-2">
              <span className="font-semibold text-foreground/80">{t("kundli.gemstone.originCountry")}: </span>
              {originCountry}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default function GemstoneCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, refresh } = useAuth();
  const UNLOCK_COST_PAISE = useFeature("paid.gemstone").pricePaise ?? 10000;
  const credits = user?.walletBalancePaise ?? 0;
  const unlocked = user?.gemstoneUnlocked ?? false;
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [showWeightSheet, setShowWeightSheet] = useState(false);

  const { state, data } = useGemstone(unlocked);

  // A stale/local `unlocked` flag can briefly disagree with the profile the
  // backend actually scopes the report to (e.g. right after switching to a
  // profile whose gemstone report isn't unlocked) — the API 403s with
  // "forbidden" in that case. Fall through to the same locked UI rather than
  // rendering nothing; re-unlocking is safe since the backend rejects a
  // second charge for an already-unlocked profile (409).
  const showLocked = !unlocked || state === "forbidden";

  const handleUnlockClick = () => {
    if (credits < UNLOCK_COST_PAISE) {
      router.push("/payment");
      return;
    }
    setShowWeightSheet(true);
  };

  const handleUnlock = async (weightKg: number | undefined) => {
    setUnlocking(true);
    setUnlockError(null);
    try {
      await api.unlockGemstone(weightKg);
      await refresh();
      if (user) purgeUserCache(user.id, { scope: "gemstone" });
      setShowWeightSheet(false);
    } catch {
      setUnlockError(t("kundli.gemstone.unlockError"));
      setShowWeightSheet(false);
    } finally {
      setUnlocking(false);
    }
  };

  // Same compact row shell as components/reports/ReportCard.tsx's one-time
  // layout (icon + label + badge + price/CTA row) — this card sits directly
  // below that list on /reports and should read as one more row in it, not
  // a visually distinct block, even though gemstone isn't a ReportCatalogueEntry
  // and has its own unlock/weight-prompt/generating flow underneath.
  const price = <span className="text-sm font-semibold text-gold">{formatRupees(UNLOCK_COST_PAISE)}</span>;

  let ctaNode: React.ReactNode;
  if (showLocked) {
    ctaNode = (
      <button
        type="button"
        onClick={handleUnlockClick}
        disabled={unlocking}
        className="shrink-0 rounded-xl bg-gold text-[#1a0e00] px-4 py-2.5 text-xs font-bold disabled:opacity-50"
      >
        {unlocking ? t("kundli.gemstone.unlocking") : t("reports.buy")}
      </button>
    );
  } else if (state === "loading" || state === "generating") {
    ctaNode = (
      <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 px-3.5 py-2 text-[11px] font-semibold">
        {t("reports.generating")}
      </span>
    );
  } else if (state === "error") {
    ctaNode = (
      <button
        type="button"
        onClick={() => router.push("/gemstones")}
        className="shrink-0 rounded-xl border border-red-500/30 text-red-400 px-4 py-2.5 text-xs font-bold"
      >
        {t("reports.retry")}
      </button>
    );
  } else {
    ctaNode = (
      <button
        type="button"
        onClick={() => router.push("/gemstones")}
        className="shrink-0 rounded-xl border border-gold/30 text-gold px-4 py-2.5 text-xs font-bold"
      >
        {t("reports.viewReport")}
      </button>
    );
  }

  return (
    <Card className="p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/gemstone.png" alt="" width={44} height={44} className="shrink-0 w-11 h-11 rounded-xl object-cover" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-foreground line-clamp-2 break-words">{t("kundli.gemstone.title")}</p>
            {showLocked && <ChevronRight size={16} className="shrink-0 mt-0.5 text-muted" />}
          </div>

          <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-1">
            <span className="text-[10px] font-medium text-muted border border-border rounded-full px-2 py-0.5">
              {t("reports.tabOneTime")}
            </span>
          </div>

          {!showLocked && state === "ready" && data?.intro && (
            <p className="text-xs text-muted mt-1.5 leading-relaxed line-clamp-2">{data.intro}</p>
          )}

          <div className="flex items-center justify-between gap-3 mt-2">
            {price}
            {ctaNode}
          </div>
        </div>
      </div>

      {unlockError && <p className="text-[11px] text-red-400">{unlockError}</p>}
      {showWeightSheet && (
        <GemstoneWeightSheet
          onSubmit={(weightKg) => void handleUnlock(weightKg)}
          onClose={() => setShowWeightSheet(false)}
          submitting={unlocking}
        />
      )}
    </Card>
  );
}
