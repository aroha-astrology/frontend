"use client";

import { useTranslation } from "react-i18next";
import { Leaf } from "lucide-react";
import Card from "@/components/ui/Card";
import StatusPill from "@/components/ui/StatusPill";
import type { PillTone } from "@/components/ui/StatusPill";
import type { PromiseBand, PromiseView } from "@/lib/progeny-report-view";

const BAND_TONE: Record<PromiseBand, PillTone> = {
  Strong: "positive",
  Moderate: "positive",
  Mixed: "neutral",
  Weak: "neutral",
};

function Row({ label, promise }: { label: string; promise: PromiseView }) {
  const { t } = useTranslation();
  const bandKey = promise.band.toLowerCase();

  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-border bg-muted/5 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-foreground">{label}</span>
        <StatusPill tone={BAND_TONE[promise.band]}>
          {t(`progenyReport.capacity.band.${bandKey}`, promise.band)}
        </StatusPill>
      </div>
      {promise.sphuta && (
        <p className="text-[11px] leading-relaxed text-muted">
          {t(`progenyReport.capacity.sphuta.${promise.sphuta.kind}`)}
          {": "}
          {promise.sphuta.rasi} · {t(`progenyReport.capacity.strength.${promise.sphuta.strength}`)}
        </p>
      )}
      {promise.isChidraTithi && (
        <p className="text-[10px] leading-relaxed text-amber-400">
          {t("progenyReport.capacity.chidraNote")}
        </p>
      )}
    </div>
  );
}

/**
 * The mother/father progeny-promise pair -- Beeja Sphuta (father) and Kshetra Sphuta (mother),
 * always shown as CLASSICAL REPRODUCTIVE-CAPACITY INDICATORS (see the card's own note string),
 * never as a fertility measurement. Either row is absent when the backend could not assign a
 * gender role to that chart (see progeny.ts's documented gender-unknown gap) -- the whole card
 * self-hides only when BOTH are missing.
 */
export default function CapacityCard({
  mother,
  father,
}: {
  mother: PromiseView | null;
  father: PromiseView | null;
}) {
  const { t } = useTranslation();
  if (!mother && !father) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold mb-2.5">
        <Leaf size={12} />
        {t("progenyReport.capacity.title")}
      </div>
      <div className="flex flex-col gap-2">
        {mother && <Row label={t("progenyReport.capacity.mother")} promise={mother} />}
        {father && <Row label={t("progenyReport.capacity.father")} promise={father} />}
      </div>
      <p className="mt-2.5 text-[10px] leading-relaxed text-muted">
        {t("progenyReport.capacity.disclaimer")}
      </p>
    </Card>
  );
}
