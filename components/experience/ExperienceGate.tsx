"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import { suggestedSkin } from "@/lib/experience";
import { useExperience } from "@/hooks/useExperience";
import ExperienceCards from "./ExperienceCards";

/**
 * The one-time "choose your experience" prompt for someone who has not picked yet (an existing user
 * when the switch is turned on). New users pick during onboarding, so they never see this. Closing it
 * without choosing keeps today's look; it asks again on the next open.
 */
export default function ExperienceGate({ ready }: { ready: boolean }) {
  const { t, i18n } = useTranslation();
  const { info, change } = useExperience();
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState(false);

  if (!ready || dismissed || !info || !info.enabled || info.picked) return null;

  return (
    <BottomSheetModal
      onClose={() => setDismissed(true)}
      closeLabel={t("common.close")}
      header={<h2 className="text-base font-semibold text-foreground">{t("experience.gate.title")}</h2>}
    >
      <div className="space-y-4 p-1 pb-4" data-testid="experience-gate">
        <p className="text-sm text-muted">{t("experience.gate.body")}</p>
        <ExperienceCards
          suggested={suggestedSkin(i18n.language)}
          disabled={busy}
          onPick={async (skin) => {
            setBusy(true);
            setError(false);
            const res = await change(skin);
            setBusy(false);
            if (!res.ok) setError(true);
          }}
        />
        {error && <p className="text-sm text-red-400">{t("experience.settings.error")}</p>}
      </div>
    </BottomSheetModal>
  );
}
