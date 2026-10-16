"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import type { ProfileRelationship } from "@/lib/api";
import { RELATIONSHIP_KEYS } from "@/components/ProfileSwitcher";
import { relationshipsIn, type BondCategory } from "@/lib/bonds-api";
import { CATEGORY_ICON } from "@/components/bonds/category";

const GROUPS: BondCategory[] = ["romantic", "family", "professional", "social"];

/**
 * Who a saved person is to you, in two taps: the group, then the exact bond.
 * Shown in the add-a-person form while Aroha Bonds is on; the 28 relationships
 * would not fit one screen as a flat list.
 */
export default function RelationshipPicker({ onPick }: { onPick: (key: ProfileRelationship, label: string) => void }) {
  const { t } = useTranslation();
  const [group, setGroup] = useState<BondCategory | null>(null);
  const label = (r: ProfileRelationship) => t(RELATIONSHIP_KEYS[r]);

  return (
    <div data-testid="relationship-picker">
      <AnimatePresence mode="wait" initial={false}>
        {group === null ? (
          <motion.div key="groups" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            <p className="text-center text-[11px] text-muted">{t("bonds.picker.group")}</p>
            <div className="grid grid-cols-2 gap-2">
              {GROUPS.map((g) => {
                const Icon = CATEGORY_ICON[g];
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGroup(g)}
                    data-testid={`relationship-group-${g}`}
                    className="flex flex-col items-center gap-2 rounded-2xl border border-gold/20 bg-card/80 px-3 py-4 text-[13px] font-medium text-foreground transition-all hover:border-gold/50 active:scale-95"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-gold/10 text-gold">
                      <Icon size={18} />
                    </span>
                    {t(`bonds.tabs.${g}`)}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => onPick("other", label("other"))}
              className="w-full rounded-xl border border-gold/15 py-3 text-[13px] text-foreground/85 transition-all hover:border-gold/40 active:scale-95"
            >
              {label("other")}
            </button>
          </motion.div>
        ) : (
          <motion.div key={group} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
            <button type="button" onClick={() => setGroup(null)} className="flex items-center gap-1 text-[11px] font-medium text-gold">
              <ArrowLeft size={12} />
              {t("bonds.picker.change")}
            </button>
            <div className="grid grid-cols-2 gap-2">
              {relationshipsIn(group).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => onPick(r, label(r))}
                  data-testid={`relationship-${r}`}
                  className="rounded-xl border border-gold/20 bg-card/80 px-3 py-3.5 text-center text-[13px] text-foreground transition-all hover:border-gold/50 active:scale-95"
                >
                  {label(r)}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
