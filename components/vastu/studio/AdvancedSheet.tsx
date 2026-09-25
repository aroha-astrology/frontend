"use client";

import { useTranslation } from "react-i18next";
import { EyeOff, Compass, Grid3x3, Check, Info } from "lucide-react";
import { VASTU_RULE_SET } from "@/lib/vastu/rules";
import { Sheet, Eyebrow } from "./ui";

type AdvancedMode = "off" | "zones16" | "grid81";

/** Pick an advanced Vastu guide to draw over the plan (visual only). */
export default function AdvancedSheet({ open, onClose, mode, onMode }: {
  open: boolean;
  onClose: () => void;
  mode: AdvancedMode;
  onMode: (m: AdvancedMode) => void;
}) {
  const { t } = useTranslation();
  const options: { id: AdvancedMode; icon: React.ReactNode; title: string; desc: string }[] = [
    { id: "off", icon: <EyeOff size={17} />, title: t("vastu.grid.off", "Off"), desc: t("vastu.grid.offDesc", "Just the plan and the 8-direction score.") },
    { id: "zones16", icon: <Compass size={17} />, title: t("vastu.grid.zones16", "16 zones"), desc: t("vastu.grid.zones16Desc", "Finer 22.5° directions, from N and NNE round to NNW.") },
    { id: "grid81", icon: <Grid3x3 size={17} />, title: t("vastu.grid.grid81", "9×9 grid (Vastu Purusha Mandala)"), desc: t("vastu.grid.grid81Desc", "81 padas aligned to true north, with the Brahmasthan at the centre.") },
  ];

  return (
    <Sheet open={open} onClose={onClose} title={t("vastu.grid.title", "Advanced Vastu")} subtitle={t("vastu.grid.subtitle", "Traditional guides to draw over your plan.")}>
      <div className="flex flex-col gap-3">
        <Eyebrow>{t("vastu.grid.overlay", "Overlay")}</Eyebrow>
        <div className="flex flex-col gap-2" role="radiogroup" aria-label={t("vastu.grid.overlay", "Overlay")}>
          {options.map((o) => {
            const selected = mode === o.id;
            return (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onMode(o.id)}
                data-testid={`vastu-advanced-${o.id}`}
                className={
                  "flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors " +
                  (selected ? "border-gold/50 bg-gold/[0.08]" : "border-gold/15 bg-surface hover:border-gold/35")
                }
              >
                <span className={`shrink-0 flex h-9 w-9 items-center justify-center rounded-xl ${selected ? "bg-gold/15 text-gold" : "bg-gold/[0.06] text-gold/70"}`}>{o.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-[13px] font-semibold ${selected ? "text-gold" : "text-foreground"}`}>{o.title}</span>
                  <span className="block text-[11px] text-muted mt-0.5">{o.desc}</span>
                </span>
                {selected && <Check size={16} className="shrink-0 text-gold" strokeWidth={2.5} />}
              </button>
            );
          })}
        </div>

        <div className="flex items-start gap-2 rounded-2xl border border-gold/15 bg-surface px-3 py-2.5 text-[11px] text-muted">
          <Info size={14} className="shrink-0 mt-0.5 text-gold/70" />
          <p>
            {t("vastu.grid.note", "These are visual guides only — they don't change your score.")}{" "}
            <span className="whitespace-nowrap">
              {t("vastu.grid.ruleSet", "Rule set")}: <span className="font-mono text-foreground/80">{VASTU_RULE_SET.id}</span>
            </span>
          </p>
        </div>
      </div>
    </Sheet>
  );
}
