"use client";

import ChatConversation from "@/components/ai-chat/ChatConversation";
import FeatureGuard from "@/components/FeatureGuard";

export default function AIChatPage() {
  return (
    <FeatureGuard featureKey="nav.askAI">
      <ChatConversation />
    </FeatureGuard>
  );
}
