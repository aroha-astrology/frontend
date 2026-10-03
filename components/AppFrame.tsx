"use client";

import { usePathname } from "next/navigation";
import { hasAppChrome } from "@/lib/app-chrome";

/**
 * Makes room for the desktop side rail (components/SideNavigation.tsx): from
 * 1024px the TopBar and the page shift right by its width. Routes without
 * customer navigation (sign-in, onboarding, legal, admin) keep the full width.
 */
export default function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <div className={hasAppChrome(pathname) ? "lg:pl-side-nav" : undefined}>{children}</div>;
}
