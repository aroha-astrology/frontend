"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { HomeLayoutDoc } from "@/lib/home-cards";
import { useNewFeature } from "@/hooks/useFeature";
import { useAuth } from "@/providers/auth-provider";

/**
 * The owner's Home card order (switch `experience.homeLayout`). Null while the switch is off, while
 * loading, or if the request fails: Home then keeps its built-in order exactly as before.
 */
export function useHomeLayout(): HomeLayoutDoc | null {
  const { user } = useAuth();
  const { enabled } = useNewFeature("experience.homeLayout");
  const userId = user?.id;
  const [layout, setLayout] = useState<HomeLayoutDoc | null>(null);

  useEffect(() => {
    if (!enabled || !userId) {
      setLayout(null);
      return;
    }
    let cancelled = false;
    api
      .homeLayout()
      .then((res) => {
        if (!cancelled) setLayout(res.layout);
      })
      .catch(() => {
        if (!cancelled) setLayout(null);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, userId]);

  return layout;
}
