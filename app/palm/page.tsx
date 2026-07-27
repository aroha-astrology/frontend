"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Hand } from "lucide-react";
import SectionTitle from "@/components/SectionTitle";
import ProfileSwitchTrigger from "@/components/ui/ProfileSwitchTrigger";
import PalmCaptureWizard from "@/components/palm/PalmCaptureWizard";
import { useFeature } from "@/hooks/useFeature";
import { palmApi, type PalmReadingResponse } from "@/lib/palm-api";

/**
 * Not wrapped in FeatureGuard — that component is documented as nav.*-only
 * (tab-level gates); palm is a home-card entry point (`home.palmReading`),
 * same redirect-in-progress shape done inline instead.
 */
export default function PalmPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { enabled } = useFeature("home.palmReading");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [readings, setReadings] = useState<PalmReadingResponse[] | null>(null);

  useEffect(() => {
    if (!enabled) router.replace("/");
  }, [enabled, router]);

  useEffect(() => {
    if (!enabled) return;
    palmApi
      .list()
      .then((res) => setReadings(res.readings))
      .catch(() => setReadings([]));
  }, [enabled]);

  if (!enabled) return null;

  return (
    <main className="min-h-screen pb-tab-safe" style={{ background: "var(--background)" }}>
      <div className="px-5 pt-4 max-w-lg mx-auto space-y-4">
        <SectionTitle title={t("palm.title")} subtitle={t("palm.subtitle")} />
        <ProfileSwitchTrigger className="mb-4 -mt-2" />

        <button
          type="button"
          onClick={() => setWizardOpen(true)}
          className="w-full flex items-center gap-4 rounded-3xl border border-gold/20 bg-card p-5 text-left active:scale-[0.98] transition-transform"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-gold/40 text-gold">
            <Hand size={24} />
          </div>
          <div className="flex-1">
            <p className="font-display text-base text-gold mb-0.5">{t("palm.startNew")}</p>
            <p className="text-xs text-muted leading-relaxed">{t("palm.startNewDesc")}</p>
          </div>
        </button>

        {readings && readings.length > 0 && (
          <div className="pt-2">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 px-1">
              {t("palm.history")}
            </p>
            <div className="space-y-2">
              {readings.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => router.push(`/palm/${r.id}`)}
                  className="w-full flex items-center justify-between rounded-2xl border border-gold/10 bg-surface px-4 py-3 text-left"
                >
                  <span className="text-sm text-foreground">
                    {t(`palm.status.${r.status}`, r.status)}
                  </span>
                  <span className="text-xs text-muted">{t(`palm.hand.${r.primaryHand}`, r.primaryHand)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {wizardOpen && <PalmCaptureWizard onClose={() => setWizardOpen(false)} />}
    </main>
  );
}
