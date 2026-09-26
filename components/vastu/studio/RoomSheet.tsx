"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import { ROOM_TYPES } from "@/lib/vastu/data";
import { getRule } from "@/lib/vastu/rules";
import { Sheet } from "./ui";

/** "+ Room": the room catalogue, searchable, each with its traditional best zone. */
export default function RoomSheet({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (type: string) => void }) {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return ROOM_TYPES.filter((r) => !needle || t(r.labelKey, r.label).toLowerCase().includes(needle) || r.id.includes(needle));
  }, [q, t]);

  return (
    <Sheet open={open} onClose={onClose} title={t("vastu.studio.addSpace", "Add a space")} subtitle={t("vastu.studio.addSpaceHint", "It appears in the middle of your home — drag it into place.")}>
      <label className="flex items-center gap-2 rounded-xl border border-gold/20 bg-surface px-3 py-2.5 mb-3 focus-within:border-gold/50">
        <Search size={15} className="text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("vastu.studio.searchRooms", "Search rooms")}
          className="flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted"
          aria-label={t("vastu.studio.searchRooms", "Search rooms")}
        />
      </label>
      <div className="grid grid-cols-2 gap-2" data-testid="vastu-room-sheet">
        {list.map((r) => {
          const best = getRule(r.id)?.idealDirections ?? [];
          return (
            <button
              key={r.id}
              onClick={() => {
                onAdd(r.id);
                setQ("");
                onClose();
              }}
              className="group flex items-center gap-2.5 rounded-2xl border border-gold/12 bg-surface px-3 py-3 text-left hover:border-gold/45 active:scale-[0.98] transition-all"
            >
              <span className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: `${r.color}22`, boxShadow: `inset 0 0 0 1px ${r.color}55` }}>
                {r.emoji}
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-foreground truncate">{t(r.labelKey, r.label)}</span>
                {best.length > 0 && (
                  <span className="block text-[10.5px] text-muted truncate">
                    {t("vastu.studio.bestIn", "Best: {{dirs}}", { dirs: best.join(" · ") })}
                  </span>
                )}
              </span>
            </button>
          );
        })}
        {list.length === 0 && <p className="col-span-2 text-center text-xs text-muted py-6">{t("vastu.studio.noRooms", "No room matches that.")}</p>}
      </div>
    </Sheet>
  );
}
