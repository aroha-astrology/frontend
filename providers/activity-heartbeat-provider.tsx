"use client";

import { useEffect, type ReactNode } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";

/** Must match the backend's HEARTBEAT_INTERVAL_SECONDS (users.routes.ts) — the server, not this
 * client, is the source of truth for how many seconds each ping counts for. */
const HEARTBEAT_INTERVAL_MS = 60_000;

/**
 * Pings the backend every 60s while a user is signed in and the tab/webview is visible, so the
 * admin panel can report per-user time-spent (today/yesterday/week/month/year). Covers mobile
 * too, since the app is a webview loading this same site — no separate native instrumentation.
 */
export function ActivityHeartbeatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void api.activityHeartbeat().catch(() => {
        // Best-effort telemetry; a dropped ping just means today's counter undercounts by 60s.
      });
    }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [userId]);

  return <>{children}</>;
}
