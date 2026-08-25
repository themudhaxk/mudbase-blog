/**
 * Showcase apps referenced by the blog, keyed by post slug.
 *
 * Kept in code rather than in the post body so the links render as real buttons at the top of
 * the post (where someone deciding whether to read on will actually see them) instead of as an
 * inline markdown link a few paragraphs down. It also means updating a deployment URL is a
 * reviewable commit rather than an edit to published content.
 *
 * Every URL here was verified live (HTTP 200) when added.
 */
export interface Showcase {
  /** Repo/deployment slug: https://mudbase-showcase-{key}.vercel.app */
  key: string;
  /** What the demo actually is, for the link's accessible name. */
  label: string;
}

const SHOWCASES: Record<string, Showcase> = {
  "showcase-realtime-social-feed": { key: "social", label: "realtime social feed" },
  "showcase-multi-role-kanban-board": { key: "kanban", label: "multi-role Kanban board" },
  "showcase-event-ticketing-capacity-waitlist": { key: "events", label: "event ticketing app" },
  "showcase-two-sided-freelance-marketplace": { key: "marketplace", label: "freelance marketplace" },
  "showcase-storefront-catalog-checkout-payments": { key: "ecommerce", label: "storefront" },
  "showcase-ai-grounded-docs-search": { key: "docs-search", label: "docs search app" },
};

export interface ShowcaseLinks {
  liveUrl: string;
  repoUrl: string;
  label: string;
}

/** Returns null for any post that isn't a showcase, so the caller can render nothing. */
export function showcaseForSlug(slug: string): ShowcaseLinks | null {
  const s = SHOWCASES[slug];
  if (!s) return null;
  return {
    liveUrl: `https://mudbase-showcase-${s.key}.vercel.app`,
    repoUrl: `https://github.com/mudbase/mudbase-showcase-${s.key}`,
    label: s.label,
  };
}
