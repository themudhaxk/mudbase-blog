import type { ComponentPropsWithoutRef } from "react";
import { CodeBlock } from "@/components/code-block";
import { maybeMudbaseProxied } from "@/lib/image-proxy";

/**
 * Shared react-markdown component overrides for `.prose-mud` content.
 *
 * The published post page and the admin preview both render markdown through
 * `.prose-mud`, so any renderer override that should apply to both lives here -
 * a preview built on its own component map is a preview that lies.
 */

/**
 * Wraps every markdown table in a horizontal scroll container. A comparison
 * feature map is wider than a phone viewport; without this the table would force
 * the whole page to scroll sideways. Contained here, only the table scrolls, and
 * the visible frame (border, radius) is drawn on the wrapper in globals.css.
 */
function MarkdownTable(props: ComponentPropsWithoutRef<"table">): React.JSX.Element {
  return (
    <div className="prose-table-wrap">
      <table {...props} />
    </div>
  );
}

/**
 * Inline markdown images routed through the Next.js image optimizer when the
 * source is api.mudbase.dev.
 *
 * Direct cross-origin loads from api.mudbase.dev are blocked by Chrome with
 * net::ERR_BLOCKED_BY_RESPONSE.NotSameOrigin (the endpoint sends
 * Cross-Origin-Resource-Policy: same-origin). Routing through /_next/image
 * fetches the image server-side and serves it at the blog origin.
 *
 * SVG files and URLs from other origins pass through as-is: the optimizer
 * rejects SVGs without dangerouslyAllowSVG, and proxying hosts not in
 * next.config.ts remotePatterns returns 400.
 *
 * The post page overrides this with its own MarkdownImage at the call site
 * (which proxies all non-SVG URLs for broader CORP safety on published
 * content). This shared handler covers the admin live-preview case.
 */
function SharedMarkdownImage({ src, alt }: ComponentPropsWithoutRef<"img">): React.JSX.Element | null {
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={maybeMudbaseProxied(src)} alt={alt ?? ""} loading="lazy" />;
}

/**
 * Renderer overrides safe for both the published page and the admin preview.
 * `pre` is delegated to CodeBlock, which adds a language label and copy button
 * while preserving the `.prose-mud pre` styles from globals.css.
 * `img` routes api.mudbase.dev sources through the Next.js image proxy to avoid
 * Chrome blocking the load with CORP: same-origin.
 */
export const sharedMarkdownComponents = {
  table: MarkdownTable,
  pre: CodeBlock,
  img: SharedMarkdownImage,
};
