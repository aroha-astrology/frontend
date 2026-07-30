import type { NextConfig } from "next";
import packageJson from "./package.json";

const nextConfig: NextConfig = {
  env: {
    // Surfaced in the profile panel footer (see components/AppMenuDrawer.tsx)
    // as `process.env.NEXT_PUBLIC_APP_VERSION`. Sourced from this package's
    // own version at build time — not to be confused with the unrelated
    // `appVersion` field on DeviceToken in lib/api.ts, which is a
    // server-reported device-compatibility field for a different purpose.
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
};

export default nextConfig;
