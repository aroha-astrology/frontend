"use client";

import { Heart, History } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export type ShlokaTab = "mantras" | "gita" | "mala" | "favorites" | "history";

const TABS: ShlokaTab[] = ["mantras", "gita", "mala", "favorites", "history"];

/** Small dot-ring glyph standing in for a mala — lucide has no rosary/mala icon, and the project's own rule is no emoji for this kind of asset (see ShlokasCard.tsx's Om-in-a-circle for the same "draw the glyph" precedent). */
function MalaGlyph({ active }: { active: boolean }) {
  const dots = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    return { x: 11 + 8 * Math.sin(a), y: 11 - 8 * Math.cos(a) };
  });
  return (
    <svg width={22} height={22} viewBox="0 0 22 22" className={active ? "fill-gold" : "fill-muted"}>
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={1.6} />
      ))}
    </svg>
  );
}

function OmGlyph({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "font-devanagari text-[15px] leading-none w-[22px] h-[22px] flex items-center justify-center",
        active ? "text-gold" : "text-muted",
      )}
    >
      ॐ
    </span>
  );
}

/** Same "draw the Devanagari glyph, no emoji" convention as OmGlyph above — गी (short for गीता) rather than a generic book icon, so this tab reads as specifically the Gita rather than reading material in general. */
function GitaGlyph({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "font-devanagari text-[13px] leading-none w-[22px] h-[22px] flex items-center justify-center",
        active ? "text-gold" : "text-muted",
      )}
    >
      गी
    </span>
  );
}

/**
 * The reference mockup's 4-way switcher (Mantras / Mala / Favorites /
 * History), reproduced as its own screen-local bar rather than folded into
 * the app's global BottomNavigation — that stays untouched per the redesign
 * plan. "Mantras" and "Mala" are real routes; "Favorites" and "History" are
 * view-modes within the list page, so this is a controlled component and
 * the caller decides what selecting each tab actually does (navigate vs.
 * set local state) — see app/shlokas/page.tsx and app/shlokas/mala/page.tsx.
 */
export default function ShlokaTabs({
  active,
  onSelect,
  hidden,
}: {
  active: ShlokaTab;
  onSelect: (tab: ShlokaTab) => void;
  /** Tabs to omit entirely — the Gita tab uses this to stay behind `nav.gita`
   * (default off) even for groups that already have `nav.shlokas` on, per
   * the standing "new features ship dark" rule. */
  hidden?: ShlokaTab[];
}) {
  const { t } = useTranslation();
  const visibleTabs = hidden?.length ? TABS.filter((tab) => !hidden.includes(tab)) : TABS;
  return (
    <div className="flex items-stretch rounded-2xl border border-gold/20 bg-card overflow-hidden">
      {visibleTabs.map((tab, i) => {
        const isActive = tab === active;
        return (
          <button
            key={tab}
            type="button"
            onClick={() => onSelect(tab)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-2.5 min-h-11 transition-colors",
              i > 0 && "border-l border-gold/10",
            )}
          >
            {tab === "mantras" && <OmGlyph active={isActive} />}
            {tab === "gita" && <GitaGlyph active={isActive} />}
            {tab === "mala" && <MalaGlyph active={isActive} />}
            {tab === "favorites" && <Heart size={20} className={isActive ? "fill-gold text-gold" : "text-muted"} />}
            {tab === "history" && <History size={20} className={isActive ? "text-gold" : "text-muted"} />}
            <span className={cn("text-[10px] font-medium", isActive ? "text-gold" : "text-muted")}>
              {t(`shlokas.tabs.${tab}`)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
