"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";

const PUBLIC_PATHS = ["/sign-in", "/sign-up"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { firebaseUser, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (loading) return;
    if (!firebaseUser && !isPublic) {
      router.replace("/sign-in");
    }
  }, [firebaseUser, loading, isPublic, router]);

  if (loading) {
    return null;
  }

  if (!firebaseUser && !isPublic) {
    return null;
  }

  return <>{children}</>;
}
