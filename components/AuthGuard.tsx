"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import ConsentGate from "@/components/ConsentGate";
import AuthLoadingScreen from "@/components/AuthLoadingScreen";
import { LEGAL_VERSION } from "@/lib/legal-content";

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

  // Read via ref, not as an effect dependency (see below) — the onboarding
  // check must see the current user without re-running every time `user`
  // itself changes.
  const userRef = useRef(user);
  userRef.current = user;

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

    const currentUser = userRef.current;
    if (firebaseUser && currentUser && !isAdmin && !currentUser.profileCompletedAt && !isOnboarding && !isPublic) {
      router.replace("/onboarding");
    }
    // Deliberately not reactive on `user`: this gate only needs to run once
    // per session bootstrap (`loading` resolving) or on a route change —
    // never on a later background refresh() (periodic poll, tab focus, app
    // resume). Those exist to pick up admin/feature/wallet changes, not to
    // re-litigate onboarding status — otherwise a transient/stale
    // profileCompletedAt read on any of those ticks would yank an
    // already-active session back into the onboarding wizard mid-use.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser, loading, isPublic, isOnboarding, isAdmin, isAdminRoute, router]);

  if (loading) return <AuthLoadingScreen />;
  if (!firebaseUser && !isPublic) return null;
  if (firebaseUser && isAdmin && !isAdminRoute) return null;

  // Anyone who completed onboarding before the consent checkbox existed
  // there never had dataProcessingConsentAt set — without this gate they'd
  // be permanently 403'd out of chat/forecast/matchmaking with no recovery
  // path in the app. Onboarding itself already collects consent, so skip
  // this on that route to avoid asking twice in the same flow. Admins never
  // go through onboarding at all, so they're exempt from this gate too.
  //
  // The same gate also handles a *stale* consent: a user who agreed to an
  // earlier version of the Terms/Privacy Policy is re-asked once the
  // documents change materially. Without this, a version bump would never
  // reach an existing user and their consent record would permanently name
  // a superseded document. `termsVersion` is already on the user DTO, so
  // this needs no schema change.
  const consentStale =
    !!user?.dataProcessingConsentActive && user.termsVersion !== LEGAL_VERSION;

  if (
    firebaseUser &&
    user &&
    !isAdmin &&
    user.profileCompletedAt &&
    (!user.dataProcessingConsentActive || consentStale) &&
    !isOnboarding &&
    !isPublic
  ) {
    return <ConsentGate stale={consentStale} />;
  }

  return <>{children}</>;
}
