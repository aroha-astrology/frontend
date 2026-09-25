"use client";

import VastuPlanner from "@/components/vastu/VastuPlanner";
import FeatureGuard from "@/components/FeatureGuard";

export default function VastuPage() {
  return (
    <FeatureGuard featureKey="nav.vastu">
      <main className="min-h-screen pb-tab-safe" style={{ background: "var(--background)" }}>
        <div className="px-4 pt-3">
          <VastuPlanner />
        </div>
      </main>
    </FeatureGuard>
  );
}
