"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, type ShagunProduct, type ShagunProductCategory } from "@/lib/api";
import SectionTitle from "@/components/SectionTitle";
import Card from "@/components/ui/Card";
import CategoryChipRow, { type CategoryChipRowOption } from "@/components/ui/CategoryChipRow";
import ShagunProductCard, { SHAGUN_CATEGORIES, shagunCategoryLabelKey } from "@/components/shagun/ShagunProductCard";
import ShagunProductDrawer from "@/components/shagun/ShagunProductDrawer";

/** Loading skeleton, `PoojaCardSkeleton`'s pattern adapted for the image block. */
function ShagunProductCardSkeleton() {
  return (
    <Card className="overflow-hidden border-gold/10 animate-pulse">
      <div className="aspect-square w-full bg-gold/10" />
      <div className="p-3">
        <div className="h-3.5 w-4/5 rounded bg-gold/10 mb-2" />
        <div className="h-3 w-1/2 rounded bg-gold/5" />
      </div>
    </Card>
  );
}

/**
 * Shagun shop — the shallowest of the 3 new customer features: browse a
 * curated catalog of third-party sellers' spiritual goods, tap a card to
 * open the drawer, tap "View on Seller Site" to leave the app. No cart, no
 * checkout, no wallet-ledger integration — Aroha never sells or ships
 * anything itself here, it only links out for referral commission.
 */
export default function ShagunShopPage() {
  const { t } = useTranslation();
  const [category, setCategory] = useState<ShagunProductCategory | "all">("all");
  const [items, setItems] = useState<ShagunProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ShagunProduct | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .shagunProducts(category === "all" ? undefined : category)
      .then((res) => setItems(res.items))
      .catch(() => setError(t("shagun.loadError")))
      .finally(() => setLoading(false));
  }, [category, t]);

  useEffect(() => {
    load();
  }, [load]);

  const categoryOptions: CategoryChipRowOption<ShagunProductCategory>[] = SHAGUN_CATEGORIES.map((value) => ({
    value,
    label: t(shagunCategoryLabelKey(value)),
  }));

  function openDrawer(product: ShagunProduct) {
    setSelectedProduct(product);
    setIsDrawerOpen(true);
  }

  return (
    <main className="min-h-screen pb-tab-safe bg-background">
      <div className="px-5 pt-10">
        <SectionTitle title={t("shagun.catalogTitle")} subtitle={t("shagun.catalogSubtitle")} />

        <CategoryChipRow<ShagunProductCategory>
          value={category}
          options={categoryOptions}
          onChange={setCategory}
          allLabel={t("shagun.allLabel")}
          className="mb-4"
        />

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <ShagunProductCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 py-8">
            <p className="text-[12px] text-red-400 text-center">{error}</p>
            <button onClick={load} className="text-[12px] text-gold underline underline-offset-2">
              {t("shagun.retry")}
            </button>
          </div>
        ) : items.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-muted">{t("shagun.emptyState")}</p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((product) => (
              <ShagunProductCard key={product.id} product={product} onClick={() => openDrawer(product)} />
            ))}
          </div>
        )}
      </div>

      {selectedProduct && (
        <ShagunProductDrawer product={selectedProduct} isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
      )}
    </main>
  );
}
