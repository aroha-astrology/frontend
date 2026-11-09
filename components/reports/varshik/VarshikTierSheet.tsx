"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import { formatRupees } from "@/lib/format";
import type { VarshikCatalogueTier, VarshikTierSlug } from "@/lib/reports-api";

/** "20 pages" for the Snapshot, "34+ pages" for the others (the questions pages vary from reader to reader). */
export function tierPagesLabel(t: (k: string, o?: Record<string, unknown>) => string, tier: Pick<VarshikCatalogueTier, "tierSlug" | "pageCount">): string {
  return tier.tierSlug === "basic"
    ? t("varshik.tiers.pages", { defaultValue: "{{n}} pages", n: tier.pageCount })
    : t("varshik.tiers.pagesPlus", { defaultValue: "{{n}}+ pages", n: tier.pageCount });
}

/**
 * The first step of buying Varshik Rashifal: pick one of the tiers on sale. Gold is selected to start
 * with (or the one marked popular) so the comparison is already open. The prices and text come from
 * the server (Admin → Varshik Pricing); the server charges its own price for the tier chosen here.
 */
export default function VarshikTierSheet({
  tiers,
  onClose,
  onContinue,
}: {
  tiers: VarshikCatalogueTier[];
  onClose: () => void;
  onContinue: (slug: VarshikTierSlug) => void;
}) {
  const { t } = useTranslation();
  const sorted = [...tiers].sort((a, b) => a.sortOrder - b.sortOrder);
  const [slug, setSlug] = useState<VarshikTierSlug>(
    (sorted.find((x) => x.isPopular) ?? sorted.find((x) => x.tierSlug === "gold") ?? sorted[0])?.tierSlug ?? "gold",
  );
  const chosen = sorted.find((x) => x.tierSlug === slug) ?? sorted[0];

  return (
    <BottomSheetModal
      onClose={onClose}
      closeLabel={t("common.close")}
      header={
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{t("varshik.tiers.title", { defaultValue: "Choose your Varshik Rashifal" })}</p>
          <p className="text-xs text-muted">{t("varshik.tiers.sub", { defaultValue: "Same year, same chart. Pick how much of it you want." })}</p>
        </div>
      }
    >
      {chosen ? (
        <div className="flex flex-col gap-3 pb-1" data-testid="varshik-tier-sheet">
          <div role="radiogroup" aria-label={t("varshik.tiers.title", { defaultValue: "Choose your Varshik Rashifal" })} className="flex flex-col gap-3">
            {sorted.map((tier) => {
              const selected = tier.tierSlug === slug;
              const struck = tier.originalPricePaise !== null && tier.originalPricePaise > tier.payPaise ? tier.originalPricePaise : null;
              return (
                <button
                  key={tier.tierSlug}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  data-testid={`varshik-tier-${tier.tierSlug}`}
                  onClick={() => setSlug(tier.tierSlug)}
                  className={`relative w-full min-w-0 rounded-2xl border p-4 text-left transition-colors ${
                    selected ? "border-gold bg-gold/10" : "border-border bg-surface"
                  }`}
                >
                  {tier.badgeText ? (
                    <span className="absolute -top-2.5 left-4 rounded-full bg-gold px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#1a0e00]">
                      {tier.badgeText}
                    </span>
                  ) : null}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words text-base font-semibold text-foreground">{tier.displayName}</p>
                      <p className="break-words text-xs text-muted">{tier.subtitle}</p>
                    </div>
                    <span className="shrink-0 rounded-full border border-gold/40 px-2.5 py-1 text-[11px] font-semibold text-gold">
                      {tierPagesLabel(t, tier)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-xl font-bold tabular-nums text-gold">{formatRupees(tier.payPaise)}</span>
                    {struck ? <span className="text-xs tabular-nums text-muted line-through">{formatRupees(struck)}</span> : null}
                  </div>

                  {selected ? (
                    <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
                      <p className="text-sm leading-relaxed text-foreground/85">{tier.shortDescription}</p>
                      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                        {tier.features.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                            <Check size={15} className="mt-0.5 shrink-0 text-gold" aria-hidden="true" />
                            <span className="min-w-0 break-words">{f}</span>
                          </li>
                        ))}
                        {tier.excludes.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-sm text-muted">
                            <X size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                            <span className="min-w-0 break-words">{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="sticky bottom-0 -mx-1 bg-gradient-to-t from-[var(--card,theme(colors.black))] via-[var(--card,theme(colors.black))] to-transparent px-1 pb-1 pt-3">
            <button
              type="button"
              data-testid="varshik-tier-continue"
              onClick={() => onContinue(chosen.tierSlug)}
              className="w-full rounded-full bg-gold px-4 py-3.5 text-sm font-bold text-[#1a0e00]"
            >
              {t("varshik.tiers.continue", {
                defaultValue: "Continue with {{name}} • {{price}} ({{pages}})",
                name: chosen.displayName,
                price: formatRupees(chosen.payPaise),
                pages: tierPagesLabel(t, chosen),
              })}
            </button>
          </div>
        </div>
      ) : null}
    </BottomSheetModal>
  );
}
