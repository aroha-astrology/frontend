"use client";

import { useTranslation } from "react-i18next";
import { ROOM_TYPES } from "@/lib/vastu/data";

/** Horizontal scroller of room-type chips. Tap to add a block to the plan. */
export default function RoomPalette({ onAdd }: { onAdd: (type: string) => void }) {
  const { t } = useTranslation();
  return (
    <div className="-mx-1 overflow-x-auto scrollbar-hide">
      <div className="flex gap-2 px-1 pb-1 min-w-max">
        {ROOM_TYPES.map((r) => (
          <button
            key={r.id}
            onClick={() => onAdd(r.id)}
            className="flex items-center gap-1.5 shrink-0 rounded-full border border-gold/20 bg-surface px-3 py-2 text-xs font-medium text-foreground hover:border-gold/50 active:scale-95 transition-all"
            style={{ borderLeftColor: r.color, borderLeftWidth: 3 }}
          >
            <span className="text-sm">{r.emoji}</span>
            <span>{t(r.labelKey, r.label)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
