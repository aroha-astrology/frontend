"use client";

import { usePathname } from "next/navigation";
import BottomNavigation from "@/components/BottomNavigation";

/**
 * Wraps the customer BottomNavigation so it never renders under /admin.
 * app/admin/layout.tsx is a distinct internal-tool surface with its own slim
 * top bar (Overview/Features/Users/Groups) — the customer tab bar
 * (Home/Horoscope/Ask-AI/Reports/Panchang) has no business appearing under it.
 * TopBar already self-hides outside its known routes (see TOPBAR_ROUTES in
 * components/TopBar.tsx), but BottomNavigation only hides on a fixed list of
 * pre-auth routes, so it would otherwise render on every /admin page too.
 * This is a thin wrapper from the outside, not a change to
 * BottomNavigation.tsx itself, which stays customer-nav-only.
 */
export default function BottomNavigationGate() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  return <BottomNavigation />;
}
