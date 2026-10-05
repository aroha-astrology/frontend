import type { Metadata } from "next";
import type { ReactNode } from "react";

// The sign-in page is a client component and can't export metadata itself.
// This is the page a signed-out visitor (and a crawler) lands on, so it
// carries the title and canonical that show in search.
export const metadata: Metadata = {
  title: "Sign in to Aroha Astrology: Web App",
  alternates: { canonical: "/sign-in" },
};

export default function SignInLayout({ children }: { children: ReactNode }) {
  return children;
}
