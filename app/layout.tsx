import type { Metadata } from "next";
import { Cinzel, Cinzel_Decorative, Playfair_Display, Inter, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/providers/theme-provider";
import { LanguageProvider } from "@/providers/language-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { PermissionsPromptProvider } from "@/providers/permissions-prompt-provider";
import { BackHandlerProvider } from "@/providers/back-handler-provider";
import { TopBarProvider } from "@/providers/topbar-provider";
import AuthGuard from "@/components/AuthGuard";
import TopBar from "@/components/TopBar";
import BottomNavigation from "@/components/BottomNavigation";
import PageTransition from "@/components/PageTransition";
import PermissionsPrompt from "@/components/PermissionsPrompt";
import BackButtonListener from "@/components/BackButtonListener";

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

export const metadata: Metadata = {
  title: "Aroha Astrology",
  description: "Vedic Astrology & AI Astrologer",
  manifest: "/manifest.json",
};

export const viewport = {
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
      <body className={`${cinzel.variable} ${cinzelDecorative.variable} ${playfair.variable} ${cormorant.variable} ${inter.variable}`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <LanguageProvider>
            <AuthProvider>
              <PermissionsPromptProvider>
                <BackHandlerProvider>
                  <TopBarProvider>
                    <AuthGuard>
                      <TopBar />
                      <PageTransition>{children}</PageTransition>
                      <BottomNavigation />
                      <PermissionsPrompt />
                    </AuthGuard>
                  </TopBarProvider>
                  <BackButtonListener />
                </BackHandlerProvider>
              </PermissionsPromptProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
