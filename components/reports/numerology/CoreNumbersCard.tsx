"use client";

import { useTranslation } from "react-i18next";
import Card from "@/components/ui/Card";

export interface CoreNumber {
  /** i18n key suffix under `numerologyReport.core.` — not display text. */
  key: string;
  value: number;
}

/**
 * The six core numbers this report is built on, as a grid of large numerals.
 *
 * A grid of bare numbers rather than a scored dial, because none of these are ratings — a
 * Life Path of 9 is not "better" than a 3, and any ring or bar would imply a scale that
 * numerology does not have. The numeral IS the content here.
 */
export default function CoreNumbersCard({ numbers }: { numbers: CoreNumber[] }) {
  const { t } = useTranslation();
  if (numbers.length === 0) return null;

  return (
    <section>
      <h2 className="font-display text-base text-gold mb-2">
        {t("numerologyReport.core.title")}
      </h2>
      <Card className="p-3">
        <div className="grid grid-cols-3 gap-2">
          {numbers.map((n) => (
            <div
              key={n.key}
              className="rounded-xl border border-gold/20 bg-gold/[0.04] px-2 py-3 flex flex-col items-center gap-1 text-center"
            >
              <span className="font-display text-2xl leading-none text-gold tabular-nums">
                {n.value}
              </span>
              <span className="text-[10px] leading-tight text-muted">
                {t(`numerologyReport.core.${n.key}`)}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}
