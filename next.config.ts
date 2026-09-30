import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    // Covers are uploaded once under a new file id, so a long optimizer TTL is safe and keeps
    // visitors from paying for a cold resize after every deploy.
    minimumCacheTTL: 60 * 60 * 24 * 30,
    deviceSizes: [640, 828, 1200, 1920],
    imageSizes: [360, 720],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.mudbase.dev",
        pathname: "/api/files/**",
      },
      {
        protocol: "https",
        hostname: "**.r2.dev",
      },
      {
        protocol: "https",
        hostname: "**.cloudflarestorage.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
