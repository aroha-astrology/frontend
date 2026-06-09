import type { Metadata } from "next";
import { Cinzel, Cinzel_Decorative, Playfair_Display, Inter, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/providers/theme-provider";
import { LanguageProvider } from "@/providers/language-provider";
import BottomNavigation from "@/components/BottomNavigation";

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
  themeColor: "#05060A",
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
            {children}
            <BottomNavigation />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
