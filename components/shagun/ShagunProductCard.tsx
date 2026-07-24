"use client";

import { ImageOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import Card from "@/components/ui/Card";
import type { ShagunProduct, ShagunProductCategory } from "@/lib/api";

/**
 * The 7 Shagun categories in a fixed display order, plus each one's i18n
 * label key. Exported so `app/shagun/page.tsx` (building `CategoryChipRow`
 * options) and `ShagunProductDrawer` (rendering the same category chip,
 * larger) share one source of truth instead of duplicating this 7-entry map.
 */
const CATEGORY_LABEL_KEYS: Record<ShagunProductCategory, string> = {
  gemstone: "shagun.categories.gemstone",
  rudraksha: "shagun.categories.rudraksha",
  yantra: "shagun.categories.yantra",
  mala: "shagun.categories.mala",
  idol: "shagun.categories.idol",
  "puja-item": "shagun.categories.pujaItem",
  "gift-set": "shagun.categories.giftSet",
};

export const SHAGUN_CATEGORIES: ShagunProductCategory[] = [
  "gemstone",
  "rudraksha",
  "yantra",
  "mala",
  "idol",
  "puja-item",
  "gift-set",
];

export function shagunCategoryLabelKey(category: ShagunProductCategory): string {
  return CATEGORY_LABEL_KEYS[category];
}

/**
 * Catalog grid cell for one Shagun product. Plain `<button>` (not a `Link` —
 * there's no detail route), opens the drawer via the parent's `onClick`,
 * same trigger pattern as `PoojaCard`. Aspect-square image with a static
 * category chip in the corner; falls back to a gold-tinted gradient block
 * (same formula as `AstrologerCard`'s avatar fallback) when `imageUrl` is
 * null. `priceRangeText` is rendered exactly as returned — it's a
 * pre-formatted display string, never a number, never run through
 * `formatRupees()`. The "Hand-picked" trust caption is a static i18n string,
 * not per-product data (no such field exists on `ShagunProduct`) — the plan
 * is explicit that Aroha can't make "Certified"/"Lab-tested" claims about a
 * third-party seller's own stock.
 */
export interface ShagunProductCardProps {
  product: ShagunProduct;
  onClick: () => void;
}

export default function ShagunProductCard({ product, onClick }: ShagunProductCardProps) {
  const { t } = useTranslation();

  return (
    <button type="button" onClick={onClick} className="w-full text-left">
      <Card
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="w-full h-full overflow-hidden hover:border-gold/40 cursor-pointer active:scale-[0.98] transition-transform"
      >
        <div className="relative aspect-square w-full bg-surface">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gold/80 to-purple-600/60 flex items-center justify-center text-[#1a0e00]">
              <ImageOff size={28} strokeWidth={1.5} />
            </div>
          )}
          <span className="absolute top-2 right-2 border border-gold/10 bg-card/90 backdrop-blur-sm text-muted rounded-full text-[10px] px-2 py-0.5">
            {t(shagunCategoryLabelKey(product.category))}
          </span>
        </div>

        <div className="p-3">
          <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug min-h-[2.5em]">
            {product.name}
          </h3>
          {product.priceRangeText && (
            <p className="text-sm font-semibold text-gold mt-1.5 whitespace-nowrap">{product.priceRangeText}</p>
          )}
          <p className="text-[10px] text-muted mt-1.5">{t("shagun.trustCaption")}</p>
        </div>
      </Card>
    </button>
  );
}
