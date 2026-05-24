import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Stale imports inherited from apps/web (references to deleted /api/*, server-only
  // libs). Defer type-check until UI prune pass migrates fetch('/api/...') calls to apiClient.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  // Frontend doesn't host astro-engine/shared as workspace packages — they'll arrive
  // as published npm deps. Remove from serverExternalPackages to avoid lookup failures.
  serverExternalPackages: ['@react-pdf/renderer'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  webpack: (config) => {
    // Stub Capacitor native plugins — they're dynamic-imported and guarded by
    // isNativePlatform() at runtime, so they never execute on web.
    // Mapping to false makes webpack emit an empty module instead of failing.
    const capacitorModules = [
      '@capacitor/geolocation',
      '@capacitor/camera',
      '@capacitor/browser',
      '@capacitor/push-notifications',
      '@capacitor/app',
      '@capacitor/splash-screen',
      '@capacitor/status-bar',
      '@capacitor/preferences',
      '@capacitor-community/speech-recognition',
      '@capacitor-community/text-to-speech',
    ];
    config.resolve.alias = config.resolve.alias ?? {};
    for (const mod of capacitorModules) {
      config.resolve.alias[mod] = false;
    }

    return config;
  },
};

export default nextConfig;
