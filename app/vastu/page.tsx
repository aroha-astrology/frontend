"use client";

import { useTranslation } from "react-i18next";
import SectionTitle from "@/components/SectionTitle";
import VastuPlanner from "@/components/vastu/VastuPlanner";

export default function VastuPage() {
  const { t } = useTranslation();
  return (
    <main className="min-h-screen pb-28" style={{ background: "var(--background)" }}>
      <div className="px-5 pt-4">
        <SectionTitle title={t("vastu.title")} subtitle={t("vastu.subtitle")} />
        <div className="mt-4">
          <VastuPlanner />
        </div>
      </div>
    </main>
  );
}
