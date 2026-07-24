"use client";

import { Flame } from "lucide-react";
import { useTranslation } from "react-i18next";
import Card from "@/components/ui/Card";
import { formatRupees } from "@/lib/format";
import type { PoojaCatalogItem } from "@/lib/api";

/**
 * Catalog grid cell for one pooja. Unlike `AstrologerCard` (a `Link` to a
 * detail page), this is a plain `<button>` — the fixed 9-item catalog has no
 * detail route, tapping a card opens the booking drawer directly (see
 * `app/pooja-booking/page.tsx`). Deity icon is a static lucide `Flame`
 * (no photo asset exists in the catalog data), used consistently across all
 * cards rather than trying to represent each deity individually.
 */
export interface PoojaCardProps {
  pooja: PoojaCatalogItem;
  onClick: () => void;
}

export default function PoojaCard({ pooja, onClick }: PoojaCardProps) {
  const { t } = useTranslation();

  return (
    <button type="button" onClick={onClick} className="w-full text-left">
      <Card
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="w-full h-full p-4 flex flex-col hover:border-gold/40 cursor-pointer active:scale-[0.98] transition-transform"
      >
        <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center text-gold mb-3">
          <Flame size={18} />
        </div>

        <h3 className="text-sm font-semibold text-foreground">{pooja.name}</h3>
        <p className="text-[11px] text-muted mt-1 line-clamp-2 flex-1">{pooja.description}</p>

        <div className="flex items-center justify-between mt-3 pt-2 border-t border-gold/10">
          <span className="text-[10px] text-muted">
            {t("poojaBooking.durationTag", { minutes: pooja.durationMinutes })}
          </span>
          <span className="text-sm font-semibold text-gold whitespace-nowrap">
            {formatRupees(pooja.basePricePaise)}
          </span>
        </div>
      </Card>
    </button>
  );
}
