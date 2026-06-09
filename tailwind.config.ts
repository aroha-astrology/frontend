import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./providers/**/*.{ts,tsx}",
    "./data/**/*.{ts,tsx}",
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
        gold: {
          DEFAULT: "#D4AF37",
          light: "#F4D675",
          dark: "#B18E2E",
        },
        border: "var(--border)",
        secondary: "var(--secondary)",
      },
      fontFamily: {
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
