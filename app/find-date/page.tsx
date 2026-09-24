"use client";

import NewFeatureGuard from "@/components/NewFeatureGuard";
import DecisionPlanner from "@/components/decide/DecisionPlanner";

export default function FindDateRoute() {
  return (
    <NewFeatureGuard featureKey="panchang.findMyDate">
      <DecisionPlanner kind="muhurta" />
    </NewFeatureGuard>
  );
}
