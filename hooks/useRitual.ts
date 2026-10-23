"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { localToday } from "@/lib/calendar-format";
import type { RitualPractice, RitualResult, RitualToday } from "@/lib/ritual";
import { useNewFeature } from "@/hooks/useFeature";
import { useAuth } from "@/providers/auth-provider";

/**
 * Today's Morning Ritual (switch ritual.morning): the Prashna card, whether it is done, and the merged
 * streak. One answer is shared by the Home card and the ritual page, so the card turns into the
 * "done" bar the moment the page finishes without a second request.
 */

type Listener = (today: RitualToday | null) => void;
let shared: { userId: string; today: RitualToday } | null = null;
const listeners = new Set<Listener>();

function publish(userId: string, today: RitualToday | null) {
  shared = today ? { userId, today } : null;
  listeners.forEach((l) => l(today));
}

export type RitualLoad = "idle" | "loading" | "ready" | "failed";

export function useRitual(): {
  enabled: boolean;
  today: RitualToday | null;
  load: RitualLoad;
  reload: () => void;
  complete: (practice: RitualPractice, mood: number | null) => Promise<RitualResult | null>;
} {
  const { user } = useAuth();
  const { enabled } = useNewFeature("ritual.morning");
  const userId = user?.id;
  const [today, setToday] = useState<RitualToday | null>(shared && shared.userId === userId ? shared.today : null);
  const [load, setLoad] = useState<RitualLoad>(today ? "ready" : "idle");
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    listeners.add(setToday);
    return () => {
      listeners.delete(setToday);
    };
  }, []);

  useEffect(() => {
    if (!enabled || !userId) return;
    // A cached answer from an earlier day is no good: the day rolls at the reader's own midnight.
    if (nonce === 0 && shared && shared.userId === userId && shared.today.localDate === localToday(shared.today.timeZone)) {
      setToday(shared.today);
      setLoad("ready");
      return;
    }
    let cancelled = false;
    setLoad("loading");
    api
      .ritualToday()
      .then((res) => {
        if (cancelled) return;
        publish(userId, res);
        setLoad("ready");
      })
      .catch(() => {
        if (!cancelled) setLoad("failed");
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, userId, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const complete = useCallback(
    async (practice: RitualPractice, mood: number | null): Promise<RitualResult | null> => {
      if (!userId) return null;
      try {
        const res = await api.ritualComplete({ practice, mood });
        publish(userId, res);
        return res;
      } catch {
        return null;
      }
    },
    [userId],
  );

  return { enabled, today, load, reload, complete };
}
