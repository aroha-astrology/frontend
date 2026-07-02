"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import ConsentGate from "@/components/ConsentGate";

const PUBLIC_PATHS = ["/sign-in", "/sign-up"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { firebaseUser, user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isOnboarding = pathname === "/onboarding";

  useEffect(() => {
    if (loading) return;

    if (!firebaseUser && !isPublic) {
      router.replace("/sign-in");
      return;
    }

    if (firebaseUser && user && !user.profileCompletedAt && !isOnboarding && !isPublic) {
      router.replace("/onboarding");
    }
  }, [firebaseUser, user, loading, isPublic, isOnboarding, router]);

  if (loading) return null;
  if (!firebaseUser && !isPublic) return null;

  // Anyone who completed onboarding before the consent checkbox existed
  // there never had dataProcessingConsentAt set — without this gate they'd
  // be permanently 403'd out of chat/forecast/matchmaking with no recovery
  // path in the app. Onboarding itself already collects consent, so skip
  // this on that route to avoid asking twice in the same flow.
  if (
    firebaseUser &&
    user &&
    user.profileCompletedAt &&
    !user.dataProcessingConsentActive &&
    !isOnboarding &&
    !isPublic
  ) {
    return <ConsentGate />;
  }

  return <>{children}</>;
}
