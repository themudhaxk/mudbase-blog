import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { visit } from "unist-util-visit";
import type { Root, Element } from "hast";
import type { PluggableList } from "unified";

/**
 * The single markdown pipeline, shared by the published post page and the admin preview.
 *
 * Both import from here so "what the preview shows" and "what readers get" cannot drift —
 * a preview built on its own plugin list is a preview that lies.
 */

/** Hosts whose embed URLs may appear in an <iframe src>. */
const EMBED_HOSTS = [
  "www.youtube.com",
  "youtube.com",
  "www.youtube-nocookie.com",
  "youtube-nocookie.com",
  "player.vimeo.com",
  "www.loom.com",
  "loom.com",
];

/**
 * Raw HTML is enabled so the editor's colour and video controls have something to emit —
 * markdown expresses neither. That makes sanitising mandatory rather than optional: without
 * it, anything ever written into a post body would execute in every reader's browser. The
 * schema is an allowlist, so a tag or attribute not named here is dropped.
 */
const schema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "span",
    "iframe",
    "video",
    "source",
    "figure",
    "figcaption",
  ],
  attributes: {
    ...defaultSchema.attributes,
    span: [...(defaultSchema.attributes?.span ?? []), "style"],
    iframe: ["src", "title", "width", "height", "allow", "allowFullScreen", "frameBorder", "loading"],
    video: ["src", "controls", "poster", "width", "height", "preload", "playsInline"],
    source: ["src", "type"],
  },
  protocols: {
    ...defaultSchema.protocols,
    src: ["http", "https"],
  },
};

const COLOR_ONLY_STYLE = /^\s*color\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\([\d\s.,%]+\)|[a-zA-Z]+)\s*;?\s*$/;

/**
 * hast-util-sanitize allowlists attributes but never parses CSS, so a permitted `style`
 * would otherwise accept anything — `position:fixed` overlays included. The colour picker
 * only ever emits a single `color:` declaration, so anything else is dropped.
 */
function clampSpanStyles() {
  return (tree: Root): void => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "span") return;
      const style = node.properties?.style;
      if (typeof style === "string" && COLOR_ONLY_STYLE.test(style)) return;
      if (node.properties) delete node.properties.style;
    });
  };
}

/** Drop iframes pointing anywhere other than the allowlisted video hosts. */
function restrictIframeHosts() {
  return (tree: Root): void => {
    visit(tree, "element", (node: Element, index, parent) => {
      if (node.tagName !== "iframe" || !parent || index === undefined) return;
      const src = node.properties?.src;
      if (typeof src === "string" && isSafeEmbed(src)) return;
      parent.children.splice(index, 1);
      return index;
    });
  };
}

function isSafeEmbed(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && EMBED_HOSTS.includes(parsed.hostname);
  } catch {
    return false;
  }
}

export const remarkPlugins: PluggableList = [remarkGfm];

// Order matters: raw HTML is parsed first, sanitised immediately after, then the two
// narrowing passes run, and highlighting is applied last so its class names — which the
// sanitiser would otherwise have to be loosened to permit — are added to already-clean HTML.
export const rehypePlugins: PluggableList = [
  rehypeRaw,
  [rehypeSanitize, schema],
  clampSpanStyles,
  restrictIframeHosts,
  rehypeHighlight,
];

/** Build the iframe snippet for a supported video URL, or null if the host is not allowed. */
export function embedHtmlFor(url: string): string | null {
  const embedUrl = toEmbedUrl(url.trim());
  if (!embedUrl || !isSafeEmbed(embedUrl)) return null;
  return `<iframe src="${embedUrl}" title="Embedded video" width="560" height="315" allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture" allowFullScreen loading="lazy"></iframe>`;
}

/** Turn a watch/share URL into the host's embed URL. Returns null for unsupported hosts. */
function toEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = parsed.pathname.slice(1);
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      if (parsed.pathname.startsWith("/embed/")) return parsed.toString();
      const id = parsed.searchParams.get("v");
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (host === "vimeo.com") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
    if (host === "player.vimeo.com" || host === "loom.com") return parsed.toString();
    return null;
  } catch {
    return null;
  }
}
