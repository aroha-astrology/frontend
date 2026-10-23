"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { problemOf, type Circle, type CircleInvite, type CircleProblem } from "@/lib/circles";
import { useNewFeature } from "@/hooks/useFeature";
import { useAuth } from "@/providers/auth-provider";

/**
 * The reader's Cosmic Circle (switches circles.circles and circles.invite). One answer is shared by
 * the Home card and the circle page so an add or a removal shows in both without a second request.
 */

type Listener = (circle: Circle | null) => void;
let shared: { userId: string; circle: Circle } | null = null;
const listeners = new Set<Listener>();

function publish(userId: string, circle: Circle | null) {
  shared = circle ? { userId, circle } : null;
  listeners.forEach((l) => l(circle));
}

export type Outcome<T = void> = { ok: true; value: T } | { ok: false; problem: CircleProblem | "generic" };

function fail(err: unknown): { ok: false; problem: CircleProblem | "generic" } {
  return { ok: false, problem: err instanceof ApiError ? (problemOf(err.message) ?? "generic") : "generic" };
}

export function useCircles(): {
  enabled: boolean;
  inviteEnabled: boolean;
  circle: Circle | null;
  failed: boolean;
  reload: () => void;
  add: (profileId: string) => Promise<Outcome>;
  remove: (memberId: string) => Promise<Outcome>;
  invite: () => Promise<Outcome<CircleInvite>>;
} {
  const { user } = useAuth();
  const { enabled } = useNewFeature("circles.circles");
  const { enabled: inviteEnabled } = useNewFeature("circles.invite");
  const userId = user?.id;
  const [circle, setCircle] = useState<Circle | null>(shared && shared.userId === userId ? shared.circle : null);
  const [failed, setFailed] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    listeners.add(setCircle);
    return () => {
      listeners.delete(setCircle);
    };
  }, []);

  useEffect(() => {
    if (!enabled || !userId) return;
    let cancelled = false;
    setFailed(false);
    api
      .circles()
      .then((res) => {
        if (!cancelled) publish(userId, res);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, userId, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const add = useCallback(
    async (profileId: string): Promise<Outcome> => {
      try {
        await api.circleAddMember(profileId);
        reload();
        return { ok: true, value: undefined };
      } catch (err) {
        return fail(err);
      }
    },
    [reload],
  );

  const remove = useCallback(
    async (memberId: string): Promise<Outcome> => {
      try {
        await api.circleRemoveMember(memberId);
        reload();
        return { ok: true, value: undefined };
      } catch (err) {
        return fail(err);
      }
    },
    [reload],
  );

  const invite = useCallback(async (): Promise<Outcome<CircleInvite>> => {
    try {
      return { ok: true, value: await api.circleCreateInvite() };
    } catch (err) {
      return fail(err);
    }
  }, []);

  return { enabled, inviteEnabled, circle, failed, reload, add, remove, invite };
}
