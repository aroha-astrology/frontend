"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import ConsentGate from "@/components/ConsentGate";

// /legal/* must be readable pre-auth: sign-in/onboarding link to the Terms
// and Privacy Policy, and consent to an unreadable document is not valid
// consent under the DPDP Act.
const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/legal"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { firebaseUser, user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isOnboarding = pathname === "/onboarding";
  // An admin account is a pure internal-tool login — no birth profile, no
  // onboarding, no customer app at all. It only ever sees /admin.
  const isAdmin = !!user?.isAdmin;
  const isAdminRoute = pathname.startsWith("/admin");

  useEffect(() => {
    if (loading) return;

    if (!firebaseUser && !isPublic) {
      router.replace("/sign-in");
      return;
    }

    // Bounces an admin off of every customer route (including "/" and
    // "/onboarding", which sign-in may have initially pointed at) straight
    // to /admin — takes priority over the onboarding check below.
    if (firebaseUser && isAdmin && !isAdminRoute) {
      router.replace("/admin");
      return;
    }

    if (firebaseUser && user && !isAdmin && !user.profileCompletedAt && !isOnboarding && !isPublic) {
      router.replace("/onboarding");
    }
  }, [firebaseUser, user, loading, isPublic, isOnboarding, isAdmin, isAdminRoute, router]);

  if (loading) return null;
  if (!firebaseUser && !isPublic) return null;
  if (firebaseUser && isAdmin && !isAdminRoute) return null;

  // Anyone who completed onboarding before the consent checkbox existed
  // there never had dataProcessingConsentAt set — without this gate they'd
  // be permanently 403'd out of chat/forecast/matchmaking with no recovery
  // path in the app. Onboarding itself already collects consent, so skip
  // this on that route to avoid asking twice in the same flow. Admins never
  // go through onboarding at all, so they're exempt from this gate too.
  if (
    firebaseUser &&
    user &&
    !isAdmin &&
    user.profileCompletedAt &&
    !user.dataProcessingConsentActive &&
    !isOnboarding &&
    !isPublic
  ) {
    return <ConsentGate />;
  }

  return <>{children}</>;
}
