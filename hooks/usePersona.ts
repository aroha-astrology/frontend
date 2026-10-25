"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useNewFeature } from "@/hooks/useFeature";
import { useAuth } from "@/providers/auth-provider";

/**
 * The guide who answers the reader (switch chat.personas): their pick, or their look's default, and the
 * four guides of their look. One answer is shared by the chat header, Settings and the labels.
 */

export interface PersonaInfo {
  look: "CLASSIC_VEDIC" | "MODERN_COSMIC";
  current: string;
  options: { id: string; name: string }[];
}

type Listener = (info: PersonaInfo | null) => void;
let shared: { userId: string; info: PersonaInfo } | null = null;
const listeners = new Set<Listener>();

function publish(userId: string, info: PersonaInfo | null) {
  shared = info ? { userId, info } : null;
  listeners.forEach((l) => l(info));
}

/** The guide's name for the screen: Yogi Baba keeps his translated name, everyone else is a plain name. */
export function guideName(info: PersonaInfo | null, translatedDefault: string): string {
  if (!info) return translatedDefault;
  const current = info.options.find((o) => o.id === info.current);
  if (!current || current.id === "yogi-baba") return translatedDefault;
  return current.name;
}

/** Guides with their own portrait in public/guides; anyone else (Yogi Baba, an unknown id) shows Yogi Baba's. */
const GUIDE_PORTRAITS = new Set(["pandit-vikram", "gauri", "kavitha-ji", "orion", "soren", "maya", "elena"]);

/** The portrait for a guide id; Yogi Baba's for him, an unknown id, or nothing chosen. */
export function guideAvatarSrc(personaId: string | null | undefined): string {
  return personaId && GUIDE_PORTRAITS.has(personaId) ? `/guides/${personaId}.webp` : "/yogi-baba.webp";
}

export function usePersona(): {
  enabled: boolean;
  info: PersonaInfo | null;
  /** The chosen guide's plain name; null for Yogi Baba, the switch being off, or before it loads. */
  customName: string | null;
  /** The chosen guide's portrait; Yogi Baba's while the switch is off or before it loads. */
  avatarSrc: string;
  choose: (personaId: string) => Promise<boolean>;
} {
  const { user } = useAuth();
  const { enabled } = useNewFeature("chat.personas");
  const userId = user?.id;
  const [info, setInfo] = useState<PersonaInfo | null>(shared && shared.userId === userId ? shared.info : null);

  useEffect(() => {
    listeners.add(setInfo);
    return () => {
      listeners.delete(setInfo);
    };
  }, []);

  useEffect(() => {
    if (!enabled || !userId) return;
    let cancelled = false;
    api
      .persona()
      .then((res) => {
        if (!cancelled) publish(userId, res);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [enabled, userId]);

  const choose = useCallback(
    async (personaId: string) => {
      if (!userId) return false;
      try {
        publish(userId, await api.setPersona(personaId));
        return true;
      } catch {
        return false;
      }
    },
    [userId],
  );

  const current = enabled && info ? info.options.find((o) => o.id === info.current) : undefined;
  const customName = current && current.id !== "yogi-baba" ? current.name : null;
  return { enabled, info: enabled ? info : null, customName, avatarSrc: guideAvatarSrc(current?.id), choose };
}
