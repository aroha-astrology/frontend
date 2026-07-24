"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { ExternalLink, ImageOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import GoldButton from "@/components/GoldButton";
import { api, ApiError, type ShagunProduct } from "@/lib/api";
import { shagunCategoryLabelKey } from "@/components/shagun/ShagunProductCard";

export interface ShagunProductDrawerProps {
  product: ShagunProduct;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Bottom sheet for one Shagun product, built directly on the generic
 * `BottomSheetModal` shell — unlike the astrologer/pooja booking drawers
 * (`HouseUnlockDrawer`-style, with a cost/insufficient-balance branch),
 * there's no charge here, so the lighter shell is the right fit.
 *
 * The single CTA calls `api.shagunProductRedirect()` — a JSON-returning,
 * auth-gated route (the backend can't be a raw redirect since only an
 * authenticated `fetch()` can attach the Bearer token) — then opens the
 * seller URL in a new tab. The drawer stays open on success (the user may
 * come back to this tab); a failed fetch (network error, or a 404 if the
 * product was deactivated) shows inline red error text instead of a silent
 * no-op.
 */
export default function ShagunProductDrawer({ product, isOpen, onClose }: ShagunProductDrawerProps) {
  const { t } = useTranslation();
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleViewOnSeller() {
    setError(null);
    setRedirecting(true);
    try {
      const result = await api.shagunProductRedirect(product.id);
      window.open(result.redirectUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("shagun.redirectError"));
    } finally {
      setRedirecting(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <BottomSheetModal
          onClose={onClose}
          closeLabel={t("common.close")}
          header={<h2 className="text-lg font-display text-foreground font-bold truncate pr-2">{product.name}</h2>}
        >
          <div className="space-y-4">
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-surface">
              {product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gold/80 to-purple-600/60 flex items-center justify-center text-[#1a0e00]">
                  <ImageOff size={40} strokeWidth={1.5} />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="border border-gold/10 text-muted rounded-full text-[11px] px-2.5 py-1">
                {t(shagunCategoryLabelKey(product.category))}
              </span>
              {product.priceRangeText && (
                <span className="text-sm font-semibold text-gold whitespace-nowrap">{product.priceRangeText}</span>
              )}
            </div>

            <p className="text-sm text-foreground/90 leading-relaxed">
              {product.description || t("shagun.noDescription")}
            </p>

            <p className="text-xs text-muted">{t("shagun.trustCaption")}</p>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <GoldButton
              variant="solid"
              fullWidth
              onClick={handleViewOnSeller}
              disabled={redirecting}
              className="flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {redirecting ? (
                t("shagun.redirecting")
              ) : (
                <>
                  {t("shagun.viewOnSellerSite")}
                  <ExternalLink size={16} />
                </>
              )}
            </GoldButton>
          </div>
        </BottomSheetModal>
      )}
    </AnimatePresence>
  );
}
