"use client";

import { useState } from "react";
import type { ChatPersona } from "@/lib/swarm-api";
import AstrologerList from "@/components/ai-chat/AstrologerList";
import ChatConversation from "@/components/ai-chat/ChatConversation";

export default function AIChatPage() {
  const [selectedPersona, setSelectedPersona] = useState<ChatPersona | null>(null);

  if (selectedPersona === null) {
    return <AstrologerList onSelect={setSelectedPersona} />;
  }

  return (
    <ChatConversation
      key={selectedPersona}
      persona={selectedPersona}
      onBack={() => setSelectedPersona(null)}
    />
  );
}
