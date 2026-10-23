"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { MemorySummary } from "@/lib/memory";
import { useNewFeature } from "@/hooks/useFeature";
import { useAuth } from "@/providers/auth-provider";

/**
 * Two small hints in chat, from one answer: "your first reply is free" (after a Baba Ji check-in) and
 * the "Sharpen your birth time" chip (after the reader confirmed a past event). Asked only when one of
 * the memory switches is on; a failed request simply shows no hint.
 */
export function useMemorySummary(): { summary: MemorySummary | null; refresh: () => void } {
  const { user } = useAuth();
  const memory = useNewFeature("memory.babaMemory").enabled;
  const vault = useNewFeature("memory.vault").enabled;
  const chip = useNewFeature("memory.rectifyChip").enabled;
  const userId = user?.id;
  const [summary, setSummary] = useState<MemorySummary | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!userId || !(memory || vault || chip)) return;
    let cancelled = false;
    api
      .memorySummary()
      .then((res) => {
        if (!cancelled) setSummary(res);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId, memory, vault, chip, nonce]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);
  return { summary, refresh };
}
