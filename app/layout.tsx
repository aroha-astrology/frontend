import type { Metadata } from "next";
import { Cinzel, Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/providers/theme-provider";
import BottomNavigation from "@/components/BottomNavigation";
import GlobalBackground from "@/components/GlobalBackground";
import PageTransitionWrapper from "@/components/PageTransitionWrapper";

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const cormorantGaramond = Cormorant_Garamond({
  weight: ["300", "400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-display-editorial",
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aroho Astrology",
  description: "Divine Guidance. AI-Powered Vedic Insights.",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#05060A",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${cinzel.variable} ${cormorantGaramond.variable} ${inter.variable}`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <GlobalBackground />
          <PageTransitionWrapper>
            {children}
          </PageTransitionWrapper>
          <BottomNavigation />
        </ThemeProvider>
      </body>
    </html>
  );
}
