"use client";

import NewFeatureGuard from "@/components/NewFeatureGuard";
import DecisionPlanner from "@/components/decide/DecisionPlanner";

export default function DecideRoute() {
  return (
    <NewFeatureGuard featureKey="nav.decisions">
      <DecisionPlanner kind="decision" />
    </NewFeatureGuard>
  );
}
