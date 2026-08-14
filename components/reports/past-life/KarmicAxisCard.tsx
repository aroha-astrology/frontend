"use client";

import { useTranslation } from "react-i18next";
import Card from "@/components/ui/Card";
import StatusPill, { strengthPillTone } from "@/components/ui/StatusPill";
import PlanetIcon from "../PlanetIcon";
import type { NodePlacement, Strength } from "@/lib/past-life-report-view";

/**
 * One end of the karmic axis: the node, the house it sits in, and its sign.
 *
 * Sign names render in the backend's English — a known app-wide gap that this card cannot
 * close alone (the same gap ReportHeaderCard notes for lagna and nakshatra). Node NAMES do
 * get translated, via the shared planetNames table.
 */
function NodeEnd({ placement }: { placement: NodePlacement }) {
  const { t } = useTranslation();
  return (
    <div className="flex-1 min-w-0 flex flex-col items-center gap-1.5 text-center">
      <PlanetIcon planet={placement.node} size={38} />
      <p className="text-xs font-semibold text-foreground capitalize">
        {t(`planetNames.${placement.node}`, { defaultValue: placement.node })}
      </p>
      {placement.house !== null && (
        <p className="text-[11px] text-gold">
          {t("pastLifeReport.axis.house", { house: placement.house })}
        </p>
      )}
      {placement.sign && <p className="text-[10px] text-muted">{placement.sign}</p>}
    </div>
  );
}

export interface KarmicAxisCardProps {
  rahu: NodePlacement;
  ketu: NodePlacement;
  archetype: { label: string; description: string } | null;
  twelfthLordStrength: Strength | null;
  conjunctPlanets: string[];
}

/**
 * The defining visual of this report: the Rahu/Ketu axis, drawn as two ends of one line rather
 * than as two separate facts, because the whole reading is about the axis they form — Ketu is
 * what was carried in, Rahu what is to be moved toward.
 *
 * The karmic theme is shown as a plain label and description, NOT through the shared
 * ArchetypeCard: `karmicArchetype` is `{label, description}` with no scored traits, and
 * ArchetypeCard's whole layout is the trait bars this report never computes.
 */
export default function KarmicAxisCard({
  rahu,
  ketu,
  archetype,
  twelfthLordStrength,
  conjunctPlanets,
}: KarmicAxisCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="p-4">
      <h2 className="font-display text-sm text-foreground mb-3">{t("pastLifeReport.axis.title")}</h2>

      <div className="flex items-start gap-2">
        <NodeEnd placement={ketu} />
        <div className="flex flex-col items-center pt-4 shrink-0">
          <div className="h-px w-10 bg-gradient-to-r from-gold/10 via-gold/50 to-gold/10" />
          <span className="text-[9px] text-muted mt-1">{t("pastLifeReport.axis.connector")}</span>
        </div>
        <NodeEnd placement={rahu} />
      </div>

      {archetype && (
        <div className="mt-3.5 pt-3 border-t border-gold/10">
          <p className="font-display text-sm text-gold">{archetype.label}</p>
          <p className="text-[11px] leading-relaxed text-muted mt-1">{archetype.description}</p>
        </div>
      )}

      {twelfthLordStrength && (
        <div className="mt-3 pt-3 border-t border-gold/10 flex items-center gap-2">
          <span className="text-xs text-foreground/90 flex-1">
            {t("pastLifeReport.twelfthLord")}
          </span>
          <StatusPill tone={strengthPillTone(twelfthLordStrength)}>
            {t(`pastLifeReport.strength.${twelfthLordStrength}`)}
          </StatusPill>
        </div>
      )}

      {conjunctPlanets.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gold/10">
          <p className="text-[10px] text-muted mb-2">{t("pastLifeReport.amplifiers")}</p>
          <div className="flex flex-wrap gap-2">
            {conjunctPlanets.map((planet) => (
              <span
                key={planet}
                className="flex items-center gap-1.5 rounded-full border border-gold/25 bg-gold/[0.06] pl-1 pr-2.5 py-1"
              >
                <PlanetIcon planet={planet} size={20} />
                <span className="text-[11px] text-foreground/90 capitalize">
                  {t(`planetNames.${planet}`, { defaultValue: planet })}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
