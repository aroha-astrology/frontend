import { defineConfig } from "vitest/config";
import path from "path";

// Minimal config for pure-logic unit tests (lib/*.test.ts). No React/DOM
// environment is configured on purpose — the first consumer (period-expiry)
// is plain date-math with no browser globals, and keeping the default "node"
// environment keeps runs fast. Add a jsdom environment override here if a
// future test needs one rather than switching the whole project over.
export default defineConfig({
  resolve: {
    alias: {
      // Mirrors tsconfig.json's "@/*" -> "./*" path mapping.
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    include: ["**/*.test.ts", "**/*.test.tsx"],
    // Bare names only match at the top level, so the old list let the glob walk
    // into the nested repos and their worktrees. Mirror .gitignore's subproject
    // folders here — they are separate repos with their own test setup, and
    // running them from this config loads the wrong aliases and no setup files.
    exclude: [
      "**/node_modules/**",
      "**/.next/**",
      "**/.worktrees/**",
      ".claude/**",
      "backend/**",
      "frontend/**",
      "landing/**",
      "mobile/**",
      "e2e/**",
    ],
  },
});
