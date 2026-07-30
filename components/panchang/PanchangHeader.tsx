"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Share2, Check } from "lucide-react";
import IconButton from "@/components/ui/IconButton";

interface PanchangHeaderProps {
  /** Shown under the title, e.g. `data?.date` — the display-formatted date string already returned by the panchang endpoint. */
  subtitle?: string;
  /** Pre-built share text summarizing today's panchang — composed by the caller (which has the fetched data + t()); this component only owns the share mechanics. */
  shareText: string;
}

/**
 * Header for the Panchang page: back button, centered title/date, and a
 * native-share button.
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
export default function PanchangHeader({ subtitle, shareText }: PanchangHeaderProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    navigator.clipboard.writeText(shareText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // Matches app/profile/page.tsx's handleShare/handleCopy pattern: try the
  // native share sheet, silently fall back to clipboard when unavailable,
  // and treat a user-dismissed share sheet (AbortError) as a deliberate
  // "no" rather than a failure worth falling back from.
  async function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Aroha Astrology", text: shareText });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        handleCopy();
      }
    } else {
      handleCopy();
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gold/10 bg-card/60 backdrop-blur-md px-2 py-2">
      <IconButton onClick={() => router.back()} aria-label={t("common.back")}>
        <ArrowLeft size={18} />
      </IconButton>
      <div className="flex-1 min-w-0 text-center">
        <h1 className="text-base font-display text-foreground truncate">{t("horoscope.panchang.todayTitle")}</h1>
        {subtitle && <p className="text-[11px] text-muted mt-0.5 truncate">{subtitle}</p>}
      </div>
      <IconButton onClick={handleShare} aria-label={t("horoscope.panchang.share")}>
        {copied ? <Check size={16} className="text-emerald-400" /> : <Share2 size={16} />}
      </IconButton>
    </div>
  );
}
