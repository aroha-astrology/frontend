"use client";

import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { HeartHandshake, ChevronRight } from "lucide-react";
import Link from "next/link";

/**
 * Married readers get a route into the combined (two-chart) reading, which is the existing
 * Compatibility Match Report — NOT a second reading built into this screen.
 *
 * Deliberately a link, not a form: /compatibility already collects both sides' birth details
 * and owns the purchase (price, wallet balance, consent gate, 409/403 handling). Re-collecting
 * spouse details here would mean a second billing surface to keep in step with that one, and an
 * earlier version of this card did exactly that — it POSTed `answers: {spouseName, ...}` to
 * `purchase({reportKey: "marriage"})`, which the backend has no handler for: the row was
 * deduped away, the wallet was debited and refunded, no reading was ever generated, and the
 * card still showed a green "ready shortly" confirmation.
 */
export default function SpouseBirthCard() {
  const { t } = useTranslation();

  return (
    <section>
      <h2 className="font-display text-base text-gold mb-2">
        {t("marriageReport.spouseDetails.title")}
      </h2>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Link
          href="/compatibility"
          className="flex items-center gap-3 rounded-2xl border border-gold/20 bg-card p-4 active:scale-[0.99] transition-transform"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-gold/15 text-gold">
            <HeartHandshake size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              {t("marriageReport.spouseDetails.cta")}
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
              {t("marriageReport.spouseDetails.subtitle")}
            </p>
          </div>
          <ChevronRight size={18} className="shrink-0 text-gold/60" />
        </Link>
      </motion.div>
    </section>
  );
}
