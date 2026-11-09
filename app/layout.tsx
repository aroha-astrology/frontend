import type { Metadata } from "next";
import { Cinzel, Cinzel_Decorative, Playfair_Display, Inter, Cormorant_Garamond, Noto_Sans_Devanagari, Instrument_Serif, Kalam, Noto_Serif_Devanagari, Noto_Serif_Bengali, Noto_Serif_Tamil, Noto_Serif_Telugu, Noto_Serif_Kannada, Noto_Serif_Gujarati, Alex_Brush } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/providers/theme-provider";
import { LanguageProvider } from "@/providers/language-provider";
import { LanguageSync } from "@/components/LanguageSync";
import SkinSync, { SKIN_BOOT_SCRIPT } from "@/components/experience/SkinSync";
import { AuthProvider } from "@/providers/auth-provider";
import { ActivityHeartbeatProvider } from "@/providers/activity-heartbeat-provider";
import { PostHogProvider } from "@/providers/posthog-provider";
import { PermissionsPromptProvider } from "@/providers/permissions-prompt-provider";
import { BackHandlerProvider } from "@/providers/back-handler-provider";
import { TourProvider } from "@/providers/tour-provider";
import { PopupSlotProvider } from "@/providers/popup-slot-provider";
import { TopBarProvider } from "@/providers/topbar-provider";
import AuthGuard from "@/components/AuthGuard";
import TopBar from "@/components/TopBar";
import BottomNavigationGate from "@/components/BottomNavigationGate";
import TourHost from "@/components/tour/TourHost";
import PageTransition from "@/components/PageTransition";
import PermissionsPrompt from "@/components/PermissionsPrompt";
import UpdatePrompt from "@/components/UpdatePrompt";
import FeedbackPrompt from "@/components/FeedbackPrompt";
import FestivalGiftModal from "@/components/FestivalGiftModal";
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

// Headings in the Modern Cosmic look (see html[data-skin="cosmic"] in globals.css). Loaded for everyone,
// used only by that look; swap-loaded so it never blocks the first paint.
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display-cosmic",
  display: "swap",
});

// The report book's handwriting (the reader's name on the cover, pull-quotes). Kalam draws both
// Latin and Devanagari. Not preloaded: it is only fetched when a book is opened.
const kalam = Kalam({
  subsets: ["latin", "devanagari"],
  variable: "--font-hand",
  display: "swap",
  weight: ["400", "700"],
  preload: false,
});

// The Varshik Rashifal report's own type (plan: "Premium standard"): Cormorant Garamond in the weights and the
// italic the headings and pull-quotes use, and Noto Serif for each Indic script so the report never falls back to
// a system font. next/font self-hosts them; none is preloaded, so only a reader of the report downloads them.
const reportSerif = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-vk-serif",
  display: "swap",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  preload: false,
});
const reportDeva = Noto_Serif_Devanagari({ subsets: ["devanagari"], variable: "--font-vk-deva", display: "swap", weight: ["400", "600"], preload: false });
const reportBengali = Noto_Serif_Bengali({ subsets: ["bengali"], variable: "--font-vk-bn", display: "swap", weight: ["400", "600"], preload: false });
const reportTamil = Noto_Serif_Tamil({ subsets: ["tamil"], variable: "--font-vk-ta", display: "swap", weight: ["400", "600"], preload: false });
const reportTelugu = Noto_Serif_Telugu({ subsets: ["telugu"], variable: "--font-vk-te", display: "swap", weight: ["400", "600"], preload: false });
const reportKannada = Noto_Serif_Kannada({ subsets: ["kannada"], variable: "--font-vk-kn", display: "swap", weight: ["400", "600"], preload: false });
// The reader's name on the cover: the closest Google script face to the picture's own "Prepared for" lettering (compared 2026-11-09 against Great Vibes, Pinyon Script, Parisienne, Petit Formal Script, Italianno, Allura).
const reportScript = Alex_Brush({ subsets: ["latin"], variable: "--font-vk-script", display: "swap", weight: "400", preload: false });
const reportGujarati = Noto_Serif_Gujarati({ subsets: ["gujarati"], variable: "--font-vk-gu", display: "swap", weight: ["400", "600"], preload: false });

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
      <head>
        {/* Puts the remembered look on <html> before the first paint, so a Modern Cosmic user never sees a gold flash. */}
        <script dangerouslySetInnerHTML={{ __html: SKIN_BOOT_SCRIPT }} />
      </head>
      <body className={`${instrumentSerif.variable} ${cinzel.variable} ${cinzelDecorative.variable} ${playfair.variable} ${cormorant.variable} ${inter.variable} ${notoDevanagari.variable} ${kalam.variable} ${reportSerif.variable} ${reportDeva.variable} ${reportBengali.variable} ${reportTamil.variable} ${reportTelugu.variable} ${reportKannada.variable} ${reportGujarati.variable} ${reportScript.variable}`}>
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
                            {/* One pop-up per app open (lib/popup-slot.ts). */}
                            <PopupSlotProvider>
                              <TopBar />
                              <PageTransition>{children}</PageTransition>
                              <BottomNavigationGate />
                              <PermissionsPrompt />
                              <TourHost />
                              <UpdatePrompt />
                              <FeedbackPrompt />
                              <FestivalGiftModal />
                            </PopupSlotProvider>
                          </TourProvider>
                        </AuthGuard>
                      </TopBarProvider>
                      <BackButtonListener />
                      <PushNotificationListener />
                      <PushForegroundBanner />
                      <ReferralCapture />
                      <LanguageSync />
                      <SkinSync />
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
