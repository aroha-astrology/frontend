import type { Metadata } from "next";
import { Cinzel, Cinzel_Decorative, Playfair_Display, Inter, Cormorant_Garamond, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/providers/theme-provider";
import { LanguageProvider } from "@/providers/language-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { PostHogProvider } from "@/providers/posthog-provider";
import { PermissionsPromptProvider } from "@/providers/permissions-prompt-provider";
import { BackHandlerProvider } from "@/providers/back-handler-provider";
import { TopBarProvider } from "@/providers/topbar-provider";
import AuthGuard from "@/components/AuthGuard";
import TopBar from "@/components/TopBar";
import BottomNavigationGate from "@/components/BottomNavigationGate";
import PageTransition from "@/components/PageTransition";
import PermissionsPrompt from "@/components/PermissionsPrompt";
import ShareAppPrompt from "@/components/ShareAppPrompt";
import UpdatePrompt from "@/components/UpdatePrompt";
import FeedbackPrompt from "@/components/FeedbackPrompt";
import BackButtonListener from "@/components/BackButtonListener";
import PushNotificationListener from "@/components/PushNotificationListener";
import ReferralCapture from "@/components/ReferralCapture";
import GooglePlayPurchaseReconciler from "@/components/GooglePlayPurchaseReconciler";

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const cinzelDecorative = Cinzel_Decorative({
  subsets: ["latin"],
  variable: "--font-display-decorative",
  display: "swap",
  weight: ["400", "700", "900"],
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-serif-alt",
  display: "swap",
  weight: "400",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

// Sanskrit/Devanagari text (shlokas, ॐ glyphs) previously had no loaded font
// and fell through to whatever the OS provides. Separate from the latin
// fonts above since none of them cover this subset.
const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  variable: "--font-devanagari",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aroha Astrology",
  description: "Vedic Astrology & AI Astrologer",
  manifest: "/manifest.json",
  // App, not the marketing site — keep it out of search results.
  robots: { index: false, follow: false },
};

export const viewport = {
  // Required for env(safe-area-inset-*) to resolve to anything but 0 — the
  // Android shell draws edge-to-edge under the system nav bar.
  viewportFit: "cover" as const,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF7F0" },
    { media: "(prefers-color-scheme: dark)", color: "#05060A" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${cinzel.variable} ${cinzelDecorative.variable} ${playfair.variable} ${cormorant.variable} ${inter.variable} ${notoDevanagari.variable}`}>
        <PostHogProvider>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
            <LanguageProvider>
              <AuthProvider>
                <PermissionsPromptProvider>
                  <BackHandlerProvider>
                    <TopBarProvider>
                      <AuthGuard>
                        <TopBar />
                        <PageTransition>{children}</PageTransition>
                        <BottomNavigationGate />
                        <PermissionsPrompt />
                        <UpdatePrompt />
                        <ShareAppPrompt />
                        <FeedbackPrompt />
                      </AuthGuard>
                    </TopBarProvider>
                    <BackButtonListener />
                    <PushNotificationListener />
                    <ReferralCapture />
                    <GooglePlayPurchaseReconciler />
                  </BackHandlerProvider>
                </PermissionsPromptProvider>
              </AuthProvider>
            </LanguageProvider>
          </ThemeProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
