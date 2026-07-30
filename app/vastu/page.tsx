"use client";

import { useTranslation } from "react-i18next";
import SectionTitle from "@/components/SectionTitle";
import ProfileSwitchTrigger from "@/components/ui/ProfileSwitchTrigger";
import VastuPlanner from "@/components/vastu/VastuPlanner";
import FeatureGuard from "@/components/FeatureGuard";

export default function VastuPage() {
  const { t } = useTranslation();
  return (
    <FeatureGuard featureKey="nav.vastu">
      <main className="min-h-screen pb-tab-safe" style={{ background: "var(--background)" }}>
        <div className="px-5 pt-4">
          <SectionTitle title={t("vastu.title")} subtitle={t("vastu.subtitle")} />
          <ProfileSwitchTrigger className="mb-4 -mt-2" />
          <div>
            <VastuPlanner />
          </div>
        </div>
      </main>
    </FeatureGuard>
  );
}
