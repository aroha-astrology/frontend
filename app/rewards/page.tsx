"use client";

import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import IconButton from "@/components/ui/IconButton";
import FeatureGuard from "@/components/FeatureGuard";
import DailyRewardLadder from "@/components/rewards/DailyRewardLadder";

function RewardsContent() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <main className="cosmic-bg min-h-screen pb-tab-safe">
      <div className="px-5 pt-4 max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <IconButton onClick={() => router.back()} aria-label={t("common.back")}>
            <ArrowLeft size={18} />
          </IconButton>
          <h1 className="text-lg font-display text-foreground flex-1 truncate">
            {t("rewards.pageTitle")}
          </h1>
        </div>

        <DailyRewardLadder />

        <p className="text-xs text-muted text-center px-4">{t("rewards.pageSubtitle")}</p>
      </div>
    </main>
  );
}

export default function RewardsPage() {
  return (
    <FeatureGuard featureKey="nav.rewards">
      <RewardsContent />
    </FeatureGuard>
  );
}
