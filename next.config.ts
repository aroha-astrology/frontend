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
  async headers() {
    return [
      {
        // Only / and /sign-in are meant to show in search (see app/robots.ts).
        // Every other page is signed-in app UI, so it is marked noindex here;
        // most of them are client components and can't set robots metadata.
        // Build output and files with an extension (images, manifest) are
        // left alone.
        source: "/((?!_next/|sign-in/?$|.*\\.[a-zA-Z0-9]+$).+)",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/models/:path*.glb",
        headers: [
          // ponytail: immutable means a same-filename model swap won't reach
          // already-cached clients for up to a year — rename the file
          // (e.g. earth-v2.glb) if a model ever needs replacing.
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
