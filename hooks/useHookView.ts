"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, api } from "@/lib/api";
import { useNewFeature } from "@/hooks/useFeature";
import { useAuth } from "@/providers/auth-provider";

export type HookLoad = "idle" | "loading" | "ready" | "failed";

export interface HookActResult<R> {
  ok: boolean;
  data: R | null;
  /** The server's error code (for example INSUFFICIENT_CREDITS, NOT_YET) or null. */
  code: string | null;
}

/**
 * One daily-return hook's screen data (switches hooks.*). `path` is under /v1/hooks/, for example
 * "sankalp-diya"; the server works out the sky place from the saved home city. `act` posts an action;
 * with `replace` the answer becomes the new view (the actions that return the whole view), otherwise
 * the view is fetched again.
 */
export function useHookView<T>(featureKey: string, path: string): {
  enabled: boolean;
  data: T | null;
  load: HookLoad;
  /** The server's error code for the last failed load (for example NO_CHART). */
  loadCode: string | null;
  reload: () => void;
  act: <R = T>(action: string, body?: unknown, replace?: boolean) => Promise<HookActResult<R>>;
} {
  const { user } = useAuth();
  const { enabled } = useNewFeature(featureKey);
  const userId = user?.id;
  const [data, setData] = useState<T | null>(null);
  const [load, setLoad] = useState<HookLoad>("idle");
  const [loadCode, setLoadCode] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!enabled || !userId) return;
    let cancelled = false;
    setLoad((l) => (l === "ready" ? l : "loading"));
    api
      .hookGet<T>(path)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setLoadCode(null);
        setLoad("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadCode(err instanceof ApiError ? (err.message || err.code) : null);
        setLoad("failed");
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, userId, path, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const act = useCallback(
    async <R = T,>(action: string, body?: unknown, replace = true): Promise<HookActResult<R>> => {
      try {
        const res = await api.hookPost<R>(action, body);
        if (replace) setData(res as unknown as T);
        else setNonce((n) => n + 1);
        return { ok: true, data: res, code: null };
      } catch (err) {
        return { ok: false, data: null, code: err instanceof ApiError ? (err.message || err.code) : "FAILED" };
      }
    },
    [],
  );

  return { enabled, data, load, loadCode, reload, act };
}
