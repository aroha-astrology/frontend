"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cooldownFrom, type ExperienceInfo, type ExperienceSkin } from "@/lib/experience";
import { useNewFeature } from "@/hooks/useFeature";
import { useAuth } from "@/providers/auth-provider";

/**
 * The user's look and whether they can change it (switch `experience.picker`). `info` is null while
 * the switch is off, while loading, or if the request fails: nothing about the experience shows then.
 *
 * One answer is shared by every component that asks, so the picker, the Settings row and Home agree
 * after a change without each fetching on its own.
 */

type Listener = (info: ExperienceInfo | null) => void;
let shared: { userId: string; info: ExperienceInfo } | null = null;
const listeners = new Set<Listener>();

function publish(userId: string, info: ExperienceInfo | null) {
  shared = info ? { userId, info } : null;
  listeners.forEach((l) => l(info));
}

export type ChangeResult = { ok: true } | { ok: false; waitUntil: Date | null };

export function useExperience(): {
  info: ExperienceInfo | null;
  loading: boolean;
  change: (skin: ExperienceSkin) => Promise<ChangeResult>;
} {
  const { user } = useAuth();
  const { enabled } = useNewFeature("experience.picker");
  const userId = user?.id;
  const [info, setInfo] = useState<ExperienceInfo | null>(shared && shared.userId === userId ? shared.info : null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listeners.add(setInfo);
    return () => {
      listeners.delete(setInfo);
    };
  }, []);

  useEffect(() => {
    if (!enabled || !userId) {
      setInfo(null);
      return;
    }
    if (shared && shared.userId === userId) {
      setInfo(shared.info);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api
      .experience()
      .then((res) => {
        if (!cancelled && res.enabled) publish(userId, res);
      })
      .catch(() => {
        if (!cancelled) setInfo(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, userId]);

  const change = useCallback(
    async (skin: ExperienceSkin): Promise<ChangeResult> => {
      if (!userId) return { ok: false, waitUntil: null };
      try {
        const res = await api.setExperience(skin);
        publish(userId, res);
        return { ok: true };
      } catch (err) {
        const waitUntil = cooldownFrom(err);
        if (waitUntil) {
          // The server knows better than the screen did: show the real wait from now on.
          void api
            .experience()
            .then((res) => publish(userId, res))
            .catch(() => {});
        }
        return { ok: false, waitUntil };
      }
    },
    [userId],
  );

  return { info, loading, change };
}
