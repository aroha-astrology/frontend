import type { Metadata } from "next";
import { Cinzel, Cinzel_Decorative, Playfair_Display, Inter, Cormorant_Garamond, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/providers/theme-provider";
import { LanguageProvider } from "@/providers/language-provider";
import { LanguageSync } from "@/components/LanguageSync";
import { AuthProvider } from "@/providers/auth-provider";
import { ActivityHeartbeatProvider } from "@/providers/activity-heartbeat-provider";
import { PostHogProvider } from "@/providers/posthog-provider";
import { PermissionsPromptProvider } from "@/providers/permissions-prompt-provider";
import { BackHandlerProvider } from "@/providers/back-handler-provider";
import { TourProvider } from "@/providers/tour-provider";
import { TopBarProvider } from "@/providers/topbar-provider";
import AuthGuard from "@/components/AuthGuard";
import TopBar from "@/components/TopBar";
import BottomNavigationGate from "@/components/BottomNavigationGate";
import TourHost from "@/components/tour/TourHost";
import PageTransition from "@/components/PageTransition";
import PermissionsPrompt from "@/components/PermissionsPrompt";
import ShareAppPrompt from "@/components/ShareAppPrompt";
import UpdatePrompt from "@/components/UpdatePrompt";
import FeedbackPrompt from "@/components/FeedbackPrompt";
import FestivalGiftModal from "@/components/FestivalGiftModal";
import DailyRewardModal from "@/components/DailyRewardModal";
import BackButtonListener from "@/components/BackButtonListener";
import PushNotificationListener from "@/components/PushNotificationListener";
import PushForegroundBanner from "@/components/PushForegroundBanner";
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

const APP_DESCRIPTION =
  "Aroha Astrology in your browser: free Kundli, daily Panchang, Kundli matching and personalised reports. Sign in with the same account as the Android app.";

export const metadata: Metadata = {
  metadataBase: new URL("https://app.arohaastrology.in"),
  title: "Aroha Astrology",
  description: APP_DESCRIPTION,
  manifest: "/manifest.json",
  // iPhone Safari uses this for "Add to Home Screen", which is also what lets
  // iPhone users receive web push.
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
  openGraph: {
    type: "website",
    siteName: "Aroha Astrology",
    title: "Aroha Astrology",
    description: APP_DESCRIPTION,
    images: [{ url: "/icon-512.png", width: 512, height: 512, alt: "Aroha Astrology" }],
  },
  // Only / and /sign-in are meant to be indexed. Everything else gets an
  // X-Robots-Tag noindex header in next.config.ts, which wins over this.
  robots: { index: true, follow: true },
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
                <ActivityHeartbeatProvider>
                  <PermissionsPromptProvider>
                    <BackHandlerProvider>
                      <TopBarProvider>
                        <AuthGuard>
                          {/* TourProvider wraps the modal stack, not just the page:
                              every prompt below defers to `tourActive` so nothing
                              renders underneath a running tour's scrim. */}
                          <TourProvider>
                            <TopBar />
                            <PageTransition>{children}</PageTransition>
                            <BottomNavigationGate />
                            <PermissionsPrompt />
                            <TourHost />
                            <UpdatePrompt />
                            <ShareAppPrompt />
                            <FeedbackPrompt />
                            <FestivalGiftModal />
                            <DailyRewardModal />
                          </TourProvider>
                        </AuthGuard>
                      </TopBarProvider>
                      <BackButtonListener />
                      <PushNotificationListener />
                      <PushForegroundBanner />
                      <ReferralCapture />
                      <LanguageSync />
                      <GooglePlayPurchaseReconciler />
                    </BackHandlerProvider>
                  </PermissionsPromptProvider>
                </ActivityHeartbeatProvider>
              </AuthProvider>
            </LanguageProvider>
          </ThemeProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
