"use client";

import { useState } from "react";
import { Briefcase, Coins, GraduationCap, Heart, HeartPulse, Home, Plane, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KpArea, KpPromise, KpTone } from "@/lib/kp-annual-report-view";

/**
 * Shared visual tokens for the KP Year Ahead screen. Lives under components/ (not lib/) so the
 * Tailwind JIT sees every class literal below — see lib/report-theme.ts's note on why.
 */

/** Existing report artwork reused per life area; lucide icon when there is no art for it. */
const AREA_ART: Partial<Record<KpArea, string>> = {
  career: "/career/climb.png",
  money: "/finance/rupee.png",
  love: "/marriage/ring.png",
  health: "/health/body.png",
  home: "/wealth/kalash.png",
  family: "/progeny/children.png",
};

export const AREA_ICON: Record<KpArea, LucideIcon> = {
  career: Briefcase,
  money: Coins,
  love: Heart,
  health: HeartPulse,
  home: Home,
  travel: Plane,
  learning: GraduationCap,
  family: Users,
};

export function AreaBadge({ area, size = 40 }: { area: KpArea; size?: number }) {
  const [imgError, setImgError] = useState(false);
  const art = AREA_ART[area];
  const Icon = AREA_ICON[area];
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-gold/30 bg-gradient-to-br from-gold/15 to-transparent"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {art && !imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={art} alt="" onError={() => setImgError(true)} className="h-[78%] w-[78%] object-contain" />
      ) : (
        <Icon size={Math.round(size * 0.45)} className="text-gold" />
      )}
    </span>
  );
}

export const TONE_DOT: Record<KpTone, string> = {
  peak: "bg-gold shadow-[0_0_8px_rgba(232,188,92,0.7)]",
  active: "bg-gold/40",
  quiet: "border border-foreground/30 bg-transparent",
};

export const PROMISE_PILL: Record<KpPromise, string> = {
  strong: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  steady: "border-gold/40 bg-gold/10 text-gold",
  slow: "border-sky-400/35 bg-sky-400/10 text-sky-300",
};

export function PromisePill({ promise, label }: { promise: KpPromise; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        PROMISE_PILL[promise],
      )}
    >
      {label}
    </span>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 font-display text-base text-gold">{children}</h2>;
}
