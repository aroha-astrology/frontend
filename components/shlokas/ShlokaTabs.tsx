"use client";

import { Heart, History } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export type ShlokaTab = "mantras" | "gita" | "favorites" | "history";

const TABS: ShlokaTab[] = ["mantras", "gita", "favorites", "history"];

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
 * The reference mockup's switcher (Mantras / Gita / Favorites / History),
 * reproduced as its own screen-local bar rather than folded into the app's
 * global BottomNavigation — that stays untouched per the redesign plan.
 * Mala is no longer one of these tabs: it's a per-item chant screen opened
 * from a mantra/Gita row (see app/shlokas/mala/page.tsx), not a library view.
 * "Mantras" is a real route; "Favorites" and "History" are view-modes within
 * the list page, so this is a controlled component and the caller decides
 * what selecting each tab actually does — see app/shlokas/page.tsx.
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
