import {
  Flower2,
  Flame,
  Leaf,
  ShieldCheck,
  Heart,
  Sunrise,
  HeartPulse,
  Gem,
  Star,
  Sparkles,
  BookOpen,
  Lightbulb,
  Activity,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { Shloka } from "@/lib/shlokas";

/**
 * Category metadata for `Shloka.tags` (see lib/shlokas.ts). Lives here, not
 * in lib/, because the literal Tailwind classes below must sit under a path
 * tailwind.config.ts's `content` glob scans — a runtime-built class string
 * is invisible to the JIT compiler. Same trap and same fix as
 * BottomNavigation.tsx's GRID_COLS and ReportThemeCard.tsx's HUE_GRADIENT.
 *
 * Colors are fixed Tailwind palette shades, not theme tokens — each tag
 * pill carries its own translucent background wash, so it stays legible
 * regardless of page theme. Matches the precedent already set by
 * HUE_GRADIENT (report cards) and the hardcoded gold in the chart SVGs:
 * neither varies by dark/light either.
 */
export const TAG_ORDER = [
  "peace",
  "strength",
  "prosperity",
  "protection",
  "love",
  "daily-chant",
  "healing",
  "abundance",
  "success",
  "new-beginnings",
  "knowledge",
  "wisdom",
  "health",
  "energy",
] as const;

export type ShlokaTag = (typeof TAG_ORDER)[number];

interface TagMeta {
  icon: LucideIcon;
  /** border + translucent bg + icon/text color, e.g. for a filter chip or row pill. */
  pill: string;
}

export const TAG_META: Record<ShlokaTag, TagMeta> = {
  peace: { icon: Flower2, pill: "border-sky-500/30 bg-sky-500/10 text-sky-500" },
  strength: { icon: Flame, pill: "border-red-500/30 bg-red-500/10 text-red-500" },
  prosperity: { icon: Leaf, pill: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500" },
  protection: { icon: ShieldCheck, pill: "border-violet-500/30 bg-violet-500/10 text-violet-500" },
  love: { icon: Heart, pill: "border-rose-500/30 bg-rose-500/10 text-rose-500" },
  "daily-chant": { icon: Sunrise, pill: "border-amber-500/30 bg-amber-500/10 text-amber-500" },
  healing: { icon: HeartPulse, pill: "border-teal-500/30 bg-teal-500/10 text-teal-500" },
  abundance: { icon: Gem, pill: "border-gold/30 bg-gold/10 text-gold" },
  success: { icon: Star, pill: "border-orange-500/30 bg-orange-500/10 text-orange-500" },
  "new-beginnings": { icon: Sparkles, pill: "border-cyan-500/30 bg-cyan-500/10 text-cyan-500" },
  knowledge: { icon: BookOpen, pill: "border-blue-500/30 bg-blue-500/10 text-blue-500" },
  wisdom: { icon: Lightbulb, pill: "border-indigo-500/30 bg-indigo-500/10 text-indigo-500" },
  health: { icon: Activity, pill: "border-lime-500/30 bg-lime-500/10 text-lime-500" },
  energy: { icon: Zap, pill: "border-yellow-500/30 bg-yellow-500/10 text-yellow-500" },
};

/** Falls back to a neutral gold pill for a tag slug not in TAG_META, so a data/code drift renders muted instead of throwing. */
export function tagMeta(tag: string): TagMeta {
  return TAG_META[tag as ShlokaTag] ?? { icon: Sparkles, pill: "border-gold/20 bg-gold/5 text-muted" };
}

/** Tags actually present across a shloka list, in TAG_ORDER — drives the filter chip row so an unused tag never shows an empty result set. */
export function tagsInUse(shlokas: Shloka[]): ShlokaTag[] {
  const present = new Set(shlokas.flatMap((s) => s.tags));
  return TAG_ORDER.filter((t) => present.has(t));
}
