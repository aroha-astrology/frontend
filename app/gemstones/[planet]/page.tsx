"use client";

import { useTranslation } from "react-i18next";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import IconButton from "@/components/ui/IconButton";
import GeneratingSpinner from "@/components/ui/GeneratingSpinner";
import { GemRow } from "@/components/ui/GemstoneCard";
import { useGemstone } from "@/hooks/useGemstone";
import { useAuth } from "@/providers/auth-provider";

/**
 * Full detail view for a single gemstone — the body GemstoneCard.tsx's
 * GemRow already renders (facts grid, mantra, do's/don'ts, verify
 * authenticity), just on its own page instead of inline in the card's list.
 * Reuses useGemstone rather than a new fetch — same data, same cache key.
 */
export default function GemstoneDetailPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams<{ planet: string }>();
  const { user } = useAuth();
  const unlocked = user?.gemstoneUnlocked ?? false;
  const { state, data } = useGemstone(unlocked);

  const gem = data?.gems.find((g) => g.planet.toLowerCase() === params.planet.toLowerCase());
  const displayName = gem ? t(`kundli.gemstone.data.${gem.planet}.gemName`) : t("kundli.gemstone.title");

  return (
    <main className="min-h-screen pb-tab-safe" style={{ background: "var(--background)" }}>
      <div className="px-5 pt-4 max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <IconButton onClick={() => router.back()} aria-label={t("common.back")}>
            <ArrowLeft size={18} />
          </IconButton>
          <h1 className="text-lg font-display text-foreground flex-1 truncate">{displayName}</h1>
        </div>

        {(state === "loading" || state === "generating") && (
          <GeneratingSpinner label={t("kundli.gemstone.generating")} />
        )}

        {(state === "error" || state === "forbidden") && (
          <div className="flex flex-col items-center text-center gap-3 py-16">
            <AlertTriangle size={28} className="text-red-400" />
            <p className="text-sm text-muted max-w-xs">{t("kundli.gemstone.error")}</p>
          </div>
        )}

        {state === "ready" && gem && <GemRow gem={gem} />}
      </div>
    </main>
  );
}
