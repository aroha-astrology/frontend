"use client";

import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import IconButton from "@/components/ui/IconButton";

interface PanchangHeaderProps {
  /** Shown under the title, e.g. `data?.date` — the display-formatted date string already returned by the panchang endpoint. */
  subtitle?: string;
}

/**
 * Header for the Panchang page: back button and centered title/date.
 *
 * NOT CSS `position: sticky` — the app already renders a persistent
 * `sticky top-0 z-20` global TopBar (components/TopBar.tsx) above every
 * route's own content, Panchang included. A second independently-stuck
 * `top-0` header here would fight the TopBar for the same docked position
 * once scrolled (and, being lower z-index, would end up hidden behind it).
 * app/reports/[id]/page.tsx — the precedent this component's back button
 * follows — hits the same constraint and solves it the same way: a normal
 * in-flow header row directly beneath the global TopBar, not an
 * independently-sticky one. Visual treatment (blur/border) still reads as a
 * header band; it just scrolls with the page instead of re-pinning.
 */
export default function PanchangHeader({ subtitle }: PanchangHeaderProps) {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gold/10 bg-card/60 backdrop-blur-md px-2 py-2">
      <IconButton onClick={() => router.back()} aria-label={t("common.back")}>
        <ArrowLeft size={18} />
      </IconButton>
      <div className="flex-1 min-w-0 text-center">
        <h1 className="text-base font-display text-foreground truncate">{t("horoscope.panchang.todayTitle")}</h1>
        {subtitle && <p className="text-[11px] text-muted mt-0.5 truncate">{subtitle}</p>}
      </div>
      {/* Spacer matching IconButton's w-10 so the title stays visually centered against the back button on the left. */}
      <div className="w-10 h-10 shrink-0" aria-hidden="true" />
    </div>
  );
}
