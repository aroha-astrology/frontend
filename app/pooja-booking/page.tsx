"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import { api, type PoojaCatalogItem } from "@/lib/api";
import SectionTitle from "@/components/SectionTitle";
import Card from "@/components/ui/Card";
import PoojaCard from "@/components/pooja/PoojaCard";
import PoojaBookingDrawer from "@/components/pooja/PoojaBookingDrawer";

/** Loading skeleton, matching `AstrologerCardSkeleton`'s pattern. */
function PoojaCardSkeleton() {
  return (
    <Card className="p-4 border-gold/10 animate-pulse h-[148px]">
      <div className="w-10 h-10 rounded-full bg-gold/10 mb-3" />
      <div className="h-4 w-2/3 rounded bg-gold/10 mb-2" />
      <div className="h-3 w-full rounded bg-gold/5 mb-1.5" />
      <div className="h-3 w-1/2 rounded bg-gold/5" />
    </Card>
  );
}

/**
 * Pooja catalog. Fixed, small (9-item) list — no detail page, tapping a
 * `PoojaCard` opens the booking drawer directly (same shallow-flow logic as
 * `PurchasePlanModal` being a modal, not a page). Reads better as a 2-column
 * grid than a long vertical list, per the plan's A3 section.
 */
export default function PoojaBookingCatalogPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<PoojaCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPooja, setSelectedPooja] = useState<PoojaCatalogItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .poojaCatalog()
      .then((res) => setItems(res.items))
      .catch(() => setError(t("poojaBooking.loadError")))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  function openDrawer(pooja: PoojaCatalogItem) {
    setSelectedPooja(pooja);
    setIsDrawerOpen(true);
  }

  return (
    <main className="min-h-screen pb-tab-safe bg-background">
      <div className="px-5 pt-10">
        <SectionTitle title={t("poojaBooking.catalogTitle")} subtitle={t("poojaBooking.catalogSubtitle")} />

        <Link
          href="/pooja-booking/mine"
          className="inline-flex items-center gap-0.5 text-xs font-medium text-gold hover:text-gold-light transition-colors mb-4"
        >
          {t("poojaBooking.myBookings")}
          <ChevronRight size={14} />
        </Link>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <PoojaCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 py-8">
            <p className="text-[12px] text-red-400 text-center">{error}</p>
            <button onClick={load} className="text-[12px] text-gold underline underline-offset-2">
              {t("poojaBooking.retry")}
            </button>
          </div>
        ) : items.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-muted">{t("poojaBooking.emptyState")}</p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((pooja) => (
              <PoojaCard key={pooja.id} pooja={pooja} onClick={() => openDrawer(pooja)} />
            ))}
          </div>
        )}
      </div>

      {selectedPooja && (
        <PoojaBookingDrawer
          pooja={selectedPooja}
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          onBooked={() => {}}
        />
      )}
    </main>
  );
}
