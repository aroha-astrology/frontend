"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import Card from "@/components/ui/Card";

/**
 * Reusable promo card: icon circle, title, description, chevron-right, whole
 * card a `Link`. Generalizes `MatchMakingCard.tsx`'s exact visual shape
 * (`Card` + `active:scale-[0.98]` tap feedback) into a prop-driven component
 * so every Home promo card (compatibility, astrologers, pooja booking,
 * Shagun) shares one implementation instead of copy-pasted markup.
 */
export interface PromoLinkCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  /** MatchMakingCard's home-tour system spotlights cards via `data-tour` — preserve pass-through. */
  "data-tour"?: string;
}

export default function PromoLinkCard({ icon, title, description, href, ...rest }: PromoLinkCardProps) {
  return (
    <Link href={href} data-tour={rest["data-tour"]}>
      <Card
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="w-full overflow-hidden flex flex-row items-center justify-between p-5 hover:border-gold/40 cursor-pointer active:scale-[0.98] transition-transform"
      >
        <div className="flex items-center gap-4 flex-1">
          <div className="relative w-16 h-16 rounded-full border border-gold/40 flex items-center justify-center text-gold overflow-hidden shrink-0">
            <div className="absolute inset-0 bg-gold/5 blur-sm" />
            <div className="z-10">{icon}</div>
          </div>

          <div className="flex-1 pr-2">
            <h3 className="text-lg font-display text-gold mb-1 leading-tight">{title}</h3>
            <p className="text-xs text-muted leading-relaxed">{description}</p>
          </div>
        </div>

        <div className="w-8 h-8 rounded-full border border-gold flex items-center justify-center text-gold shrink-0">
          <ChevronRight size={16} />
        </div>
      </Card>
    </Link>
  );
}
