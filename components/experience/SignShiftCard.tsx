"use client";

import { useTranslation } from "react-i18next";
import Card from "@/components/ui/Card";
import { zodiacSignLabel } from "@/data/zodiac";
import { signShift } from "@/lib/sign-shift";
import { useNewFeature } from "@/hooks/useFeature";

/**
 * "Why your sign can be different": the person's own Western and Vedic Sun and Moon side by side
 * (switch experience.signShift). Computed from their chart, so it says so plainly when a sign does
 * NOT change instead of claiming a shift.
 */
export default function SignShiftCard({
  planets,
  ayanamsaValue,
}: {
  planets: readonly Record<string, any>[];
  ayanamsaValue: number | null;
}) {
  const { t } = useTranslation();
  const { enabled } = useNewFeature("experience.signShift");
  const shift = signShift(planets, ayanamsaValue);
  if (!enabled || !shift) return null;

  const name = (sign: string) => zodiacSignLabel(t, sign);
  const rows = [
    { key: "sun", body: shift.sun, diff: "cosmicChart.signShift.sunDiff", same: "cosmicChart.signShift.sunSame" },
    { key: "moon", body: shift.moon, diff: "cosmicChart.signShift.moonDiff", same: "cosmicChart.signShift.moonSame" },
  ] as const;

  return (
    <Card className="p-4" data-testid="sign-shift-card">
      <h3 className="mb-3 text-sm font-medium text-foreground">{t("cosmicChart.signShift.title")}</h3>
      <div className="space-y-2.5">
        {rows.map(({ key, body, diff, same }) => (
          <div key={key} data-testid={`sign-shift-${key}`} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
            <div className="flex flex-wrap gap-1.5 sm:shrink-0">
              <span className="rounded-full border border-gold/40 px-2.5 py-1 text-[11px] text-foreground">
                {t("cosmicChart.signShift.western")} · {name(body.western)}
              </span>
              <span className="rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-[11px] text-gold">
                {t("cosmicChart.signShift.vedic")} · {name(body.vedic)}
              </span>
            </div>
            <p className="text-xs text-muted">
              {body.changed
                ? t(diff, { western: name(body.western), vedic: name(body.vedic) })
                : t(same, { sign: name(body.vedic) })}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs leading-snug text-muted">
        {t("cosmicChart.signShift.why", { degrees: Math.round(shift.ayanamsa) })}
      </p>
    </Card>
  );
}
