"use client";

// Deliberate i18n exception: /admin is an internal owner-only tool (revenue
// analytics, feature kill-switches, wallet/group management), never shown to
// a customer, so this entire tree stays plain hardcoded English — do NOT add
// admin.* i18n keys, per this codebase's usual "translate every user-facing
// string" rule (see MEMORY.md: i18n-translate-all-strings).

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";

type NativeCheck = "checking" | "native" | "web";

/**
 * Detects the installed Capacitor app shell the same way
 * components/GooglePlayPurchaseReconciler.tsx does (dynamic import so a
 * plain web build that never bundled @capacitor/core doesn't choke).
 */
function useNativeShellCheck(): NativeCheck {
  const [state, setState] = useState<NativeCheck>("checking");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!cancelled) setState(Capacitor.isNativePlatform() ? "native" : "web");
      } catch {
        // @capacitor/core not resolvable — plain web build, definitely not native.
        if (!cancelled) setState("web");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

const SECTIONS: { href: string; label: string }[] = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/features", label: "Features" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/groups", label: "Groups" },
  { href: "/admin/tickets", label: "Tickets" },
];

/**
 * Looks exactly like a generic "page not found" — deliberately NOT a
 * distinctive "forbidden"/"access denied" page. A signed-in non-admin who
 * guesses the /admin URL should see nothing that confirms an admin area
 * exists at all.
 */
function RouteNotFound() {
  return (
    <main className="min-h-[100dvh] flex items-center justify-center bg-background text-foreground px-6">
      <div className="text-center">
        <h1 className="text-3xl font-semibold mb-2">404</h1>
        <p className="text-sm text-muted">This page could not be found.</p>
      </div>
    </main>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const nativeCheck = useNativeShellCheck();
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      router.replace("/sign-in");
    }
  };

  // Matches AuthGuard's own idiom: render nothing until we know the answer,
  // rather than flashing a wrong state first.
  if (loading || nativeCheck === "checking") return null;

  // Defense-in-depth only, NOT the real security boundary — the backend's
  // requireAdmin middleware (checked against a phone allowlist on every
  // /v1/admin/* call) is what actually protects this data. Hiding the tree
  // inside the installed app's webview just avoids tempting fate / leaking
  // that an /admin route exists to anyone poking around a distributed
  // APK/IPA — it changes nothing about what's actually reachable over the
  // API from a native client that fakes its Capacitor signal.
  if (nativeCheck === "native") {
    return (
      <main className="min-h-[100dvh] flex items-center justify-center bg-background text-foreground px-6">
        <p className="text-sm text-muted text-center">Not available in the app.</p>
      </main>
    );
  }

  if (!user?.isAdmin) {
    return <RouteNotFound />;
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur px-5 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-6 overflow-x-auto">
          <span className="text-sm font-semibold text-gold shrink-0 tracking-wide">Admin</span>
          <nav className="flex items-center gap-5 text-sm">
            {SECTIONS.map((section) => {
              const active =
                section.href === "/admin" ? pathname === "/admin" : pathname.startsWith(section.href);
              return (
                <Link
                  key={section.href}
                  href={section.href}
                  className={
                    active
                      ? "text-gold font-medium whitespace-nowrap"
                      : "text-muted hover:text-foreground transition-colors whitespace-nowrap"
                  }
                >
                  {section.label}
                </Link>
              );
            })}
          </nav>
          <button
            type="button"
            onClick={handleSignOut}
            className="ml-auto shrink-0 flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-5 py-6">{children}</div>
    </div>
  );
}
