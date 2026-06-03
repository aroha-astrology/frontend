import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  async redirects() {
    return [
      { source: '/dashboard', destination: '/home', permanent: false },
      { source: '/dashboard/:path*', destination: '/home', permanent: false },
    ];
  },
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
