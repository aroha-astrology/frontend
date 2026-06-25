"use client";

import { useEffect, useRef, useState } from "react";
import { api, type Kundli, type KundliResponse } from "@/lib/api";

const POLL_INTERVAL = 2000;

export function useKundli() {
  const [kundli, setKundli] = useState<Kundli | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cancelled = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    cancelled.current = false;

    async function poll() {
      if (cancelled.current) return;
      try {
        const result: KundliResponse = await api.getKundli();
        if (cancelled.current) return;

        if (result.status === "ready") {
          setKundli(result as Kundli);
          setLoading(false);
        } else if (result.status === "pending" || result.status === "generating") {
          timer.current = setTimeout(poll, POLL_INTERVAL);
        } else if (result.status === "failed") {
          setError(result.message ?? "Kundli generation failed");
          setLoading(false);
        } else if (result.status === "missing_parameters") {
          setError(null);
          setKundli(null);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled.current) {
          setError(err instanceof Error ? err.message : "Failed to fetch kundli");
          setLoading(false);
        }
      }
    }

    poll();

    return () => {
      cancelled.current = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return { kundli, loading, error };
}
