import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./providers/**/*.{ts,tsx}",
    "./data/**/*.{ts,tsx}",
    // lib/ holds class-name maps (e.g. lib/vastu/data.ts TONE_CLASSES) — without
    // this, classes used only there (the lime "Beneficial" tone) are never generated.
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: {
          DEFAULT: "var(--surface)",
          2: "var(--surface-2)",
        },
        card: "var(--card)",
        fab: "var(--fab)",
        muted: "var(--text-muted)",
        // Gold is a theme variable (defaults in app/globals.css are exactly the old hex values), so the
        // Modern Cosmic look can recolour every gold utility - bg-gold, ring-gold/30, from-gold - at once.
        gold: {
          DEFAULT: "rgb(var(--gold-rgb) / <alpha-value>)",
          light: "rgb(var(--gold-light-rgb) / <alpha-value>)",
          dark: "rgb(var(--gold-dark-rgb) / <alpha-value>)",
        },
        border: "var(--border)",
        secondary: "var(--secondary)",
      },
      spacing: {
        sab: "var(--sab)",
        sat: "var(--sat)",
        "tab-bar": "var(--tab-bar-h)",
        "tab-safe": "calc(var(--tab-bar-h) + 2rem)",
      },
      fontFamily: {
        devanagari: ["var(--font-devanagari)", "serif"],
        display: ["var(--font-display)", "serif"],
        "display-decorative": ["var(--font-display-decorative)", "serif"],
        serif: ["var(--font-serif-alt)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
