import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

// Next's own rules (core web vitals + TypeScript). Run on one folder with `npm run lint:varshik`;
// the older screens were never linted, so a repo-wide run is expected to report existing issues.
const config = [
  { ignores: [".next/**", "node_modules/**", "out/**", "android/**", "ios/**", "public/**", ".claude/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default config;
