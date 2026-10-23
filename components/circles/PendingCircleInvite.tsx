"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useNewFeature } from "@/hooks/useFeature";
import { getPendingCircleInvite } from "@/lib/circles";
import { useAuth } from "@/providers/auth-provider";

/**
 * Mounted on Home: a reader who opened a circle invite before they had an account (or came in through
 * the Play install of an invite link) lands back on that invite once they are signed in and set up,
 * to confirm joining. Nothing is accepted here; the invite page asks.
 */
export default function PendingCircleInvite() {
  const router = useRouter();
  const { user } = useAuth();
  const { enabled } = useNewFeature("circles.invite");
  const ready = Boolean(user?.profileCompletedAt);

  useEffect(() => {
    if (!enabled || !ready) return;
    const code = getPendingCircleInvite();
    if (code) router.replace(`/circle/invite/${code}`);
  }, [enabled, ready, router]);

  return null;
}
