"use client";

import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import Card from "@/components/ui/Card";
import StatusPill from "@/components/ui/StatusPill";
import type { PillTone } from "@/components/ui/StatusPill";
import type { ConvergenceBand } from "@/lib/progeny-report-view";

/** Neither "Conflict" nor "Mixed" is framed as bad news here (that would contradict the
 * report's own honesty framing) -- but the pill still needs a visual read, so this stays
 * within the same emerald/amber/muted vocabulary StrengthsCautions/TopWindowCard already use. */
const BAND_TONE: Record<ConvergenceBand, PillTone> = {
  "Strong convergence": "positive",
  "Moderate convergence": "positive",
  Mixed: "neutral",
  Conflict: "neutral",
};

/**
 * The couple-level headline card -- the single band the two engines (mother/father promise)
 * converge on, shown before either engine's own detail. Self-hides when the backend could not
 * compute a convergence band at all (e.g. a degraded chart with no gender/partner data).
 */
export default function ProgenyOutlookCard({ band }: { band: ConvergenceBand | null }) {
  const { t } = useTranslation();
  if (!band) return null;

  const key = band.toLowerCase().replace(/\s+/g, "");

  return (
    <Card className="p-4">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold mb-2.5">
        <Sparkles size={12} />
        {t("progenyReport.outlook.title")}
      </div>
      <StatusPill tone={BAND_TONE[band]}>{t(`progenyReport.outlook.band.${key}`, band)}</StatusPill>
      <p className="mt-2 text-[11px] leading-relaxed text-muted">
        {t("progenyReport.outlook.note")}
      </p>
    </Card>
  );
}
