"use client";

import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import IconButton from "@/components/ui/IconButton";
import GeneratingSpinner from "@/components/ui/GeneratingSpinner";
import { GemRow } from "@/components/ui/GemstoneCard";
import { useGemstone } from "@/hooks/useGemstone";
import { useAuth } from "@/providers/auth-provider";

/**
 * Full gemstone report — every recommended gem's full detail (facts grid, mantra,
 * do's/don'ts, verify authenticity), reusing GemstoneCard.tsx's GemRow unchanged. The card on
 * the Kundli page only shows a single locked-looking summary + one "View Report" button (no
 * gem names/images there) — everything gemstone-specific lives here, one page behind that tap.
 */
export default function GemstonesPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const unlocked = user?.gemstoneUnlocked ?? false;
  const { state, data } = useGemstone(unlocked);

  const gems = data?.gems ? [...data.gems].sort((a, b) => Number(b.recommended) - Number(a.recommended)) : [];

  return (
    <main className="min-h-screen pb-tab-safe" style={{ background: "var(--background)" }}>
      <div className="px-5 pt-4 max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <IconButton onClick={() => router.back()} aria-label={t("common.back")}>
            <ArrowLeft size={18} />
          </IconButton>
          <h1 className="text-lg font-display text-foreground flex-1 truncate">{t("kundli.gemstone.title")}</h1>
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

        {state === "ready" && data && (
          <>
            {data.intro && <p className="text-xs text-foreground/90 leading-relaxed">{data.intro}</p>}
            <div className="space-y-3">
              {gems.map((gem) => (
                <GemRow key={gem.planet} gem={gem} />
              ))}
            </div>
            <p className="text-[9px] text-muted/70 text-center leading-relaxed">
              {t("kundli.gemstone.disclaimer")}
            </p>
          </>
        )}
      </div>
    </main>
  );
}
