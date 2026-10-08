/**
 * Builds a /_next/image proxy URL so the browser fetches the image from the
 * same origin instead of api.mudbase.dev directly.
 *
 * Direct loads from api.mudbase.dev are blocked in Chrome with
 * net::ERR_BLOCKED_BY_RESPONSE.NotSameOrigin because that host sends a
 * Cross-Origin-Resource-Policy: same-origin header. The /_next/image optimizer
 * fetches the image server-side and serves the result at the blog origin,
 * sidestepping the restriction.
 *
 * The width must be one of the values listed in next.config.ts
 * images.deviceSizes or images.imageSizes (arbitrary widths return 400).
 * SVG files bypass the optimizer because it returns 400 for them unless
 * dangerouslyAllowSVG is set.
 */
export function proxiedImageSrc(src: string, w: 640 | 828 | 1200 | 1920 = 1920): string {
  return `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=75`;
}

/**
 * Like proxiedImageSrc, but only wraps URLs that start with
 * https://api.mudbase.dev/. Other URLs are returned unchanged.
 *
 * Use this wherever the URL comes from arbitrary user input (for example the
 * admin cover field): hosts not listed in next.config.ts images.remotePatterns
 * cause the Next.js optimizer to return 400, so proxying an arbitrary URL would
 * break the preview for authors who paste an external link.
 */
export function maybeMudbaseProxied(src: string, w: 640 | 828 | 1200 | 1920 = 1920): string {
  if (!src) return src;
  if (src.toLowerCase().endsWith(".svg")) return src;
  if (src.startsWith("https://api.mudbase.dev/")) {
    return proxiedImageSrc(src, w);
  }
  return src;
}
