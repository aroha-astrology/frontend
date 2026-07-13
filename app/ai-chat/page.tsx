"use client";

import { useState, useEffect } from "react";
import ChatConversation from "@/components/ai-chat/ChatConversation";
import { getFirebaseAuth } from "@/lib/firebase";

interface KundliChart {
  id: string;
  name?: string;
}

export default function AIChatPage() {
  const [selectedChart, setSelectedChart] = useState<string | undefined>(undefined);
  const [charts, setCharts] = useState<KundliChart[]>([]);
  const [loadingCharts, setLoadingCharts] = useState(true);

  // Fetch user's Kundli charts on mount
  useEffect(() => {
    const fetchCharts = async () => {
      try {
        const auth = getFirebaseAuth();
        const user = auth.currentUser;
        if (user) {
          const token = await user.getIdToken();
          const res = await fetch("/api/kundli", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            const charts = Array.isArray(data.data) ? data.data : [];
            setCharts(charts);
            // Auto-select the first chart if available
            if (charts.length > 0) {
              setSelectedChart(charts[0].id);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch charts:", err);
      } finally {
        setLoadingCharts(false);
      }
    };

    fetchCharts();
  }, []);

  if (loadingCharts) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <p style={{ color: "var(--text-muted)" }}>Loading your Kundli...</p>
      </main>
    );
  }

  return <ChatConversation chartId={selectedChart} />;
}
