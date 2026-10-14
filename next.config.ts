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
  async redirects() {
    return [
      {
        source: "/posts/self-hosted-mongodb-on-flyio",
        destination: "/posts/self-hosted-mongodb-cluster",
        permanent: true,
      },
    ];
  },
  async headers() {
    // Content-Security-Policy-Report-Only enumerates every origin this app loads so that
    // browser console reports reveal any unlisted source before we flip to enforcement.
    // 'unsafe-inline' covers Next.js hydration inline scripts; switching to nonces requires
    // middleware-level nonce generation and is tracked as a follow-up hardening step.
    const cspReportOnly = [
      "default-src 'self'",
      // Next.js hydration inline scripts. No external script CDN: the blog has no ad pixels.
      "script-src 'self' 'unsafe-inline'",
      // Tailwind utility classes from the bundle; Next.js may inject a small inline style.
      "style-src 'self' 'unsafe-inline'",
      // next/image proxies covers through /_next/image (same origin). open https: covers
      // any CMS-embedded image that lands in post body markup via a raw <img> tag.
      "img-src 'self' data: https:",
      // Next.js font optimization downloads Google Fonts at build time and self-hosts them
      // from /_next/static/media; no external font CDN request reaches the browser.
      "font-src 'self'",
      // Vercel Speed Insights beacon is the only external XHR/fetch target.
      "connect-src 'self' https://vitals.vercel-insights.com",
      // The blog renders no iframes.
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      // DENY is already enforced via X-Frame-Options above; 'none' matches that stance.
      "frame-ancestors 'none'",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
        ],
      },
    ];
  },
};

export default nextConfig;
