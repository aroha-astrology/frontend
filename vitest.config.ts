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
    exclude: ["node_modules", ".next", ".worktrees", "e2e"],
  },
});
