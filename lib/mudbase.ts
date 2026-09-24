const API_BASE = "https://api.mudbase.dev";
const PROJECT_ID = process.env.MUDBASE_PROJECT_ID ?? "6a8b001ccd3ed654823a5732";
const COLLECTION_ID = process.env.MUDBASE_COLLECTION_ID ?? "6a8b005ccd3ed654823a5743";

export interface Post {
  /** Mudbase returns Mongo's `_id`; there is no `id` alias on the wire. */
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  coverImage: string;
  category: string;
  author: string;
  status: string;
  publishedAt: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Fallback cover, used when a post has no coverImage of its own. Without this a missing cover
 * is passed straight to next/image, whose `src` is required: an empty value throws at render
 * and takes the whole post page (and any listing that includes the post) down. Every render
 * path resolves its cover through coverImageFor() so a coverless post degrades to a branded
 * placeholder instead of a broken page. Lives in public/, so it is a plain same-origin asset.
 */
export const DEFAULT_COVER_IMAGE = "/default-cover.png";

/** The cover to render for a post: its own image if set, otherwise the branded fallback. */
export function coverImageFor(post: Pick<Post, "coverImage">): string {
  const cover = post.coverImage?.trim();
  return cover ? cover : DEFAULT_COVER_IMAGE;
}

interface MudbaseListResponse<T> {
  data?: T[];
  items?: T[];
  documents?: T[];
}

function dataUrl(): string {
  return `${API_BASE}/api/data/projects/${PROJECT_ID}/collections/${COLLECTION_ID}/data`;
}

function extractList<T>(json: MudbaseListResponse<T>): T[] {
  return json.data ?? json.items ?? json.documents ?? [];
}

/** Total retry attempts after the initial fetch (3 attempts total: 1 initial + 2 retries). */
const FETCH_RETRIES = 2;
/** Base delay in ms for exponential backoff; attempt n waits n * RETRY_BASE_MS before retrying. */
const RETRY_BASE_MS = 500;

function retryDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetches all published posts from the API with retry and graceful degradation.
 *
 * Up to FETCH_RETRIES retries are attempted with linear backoff on any non-2xx response or
 * network error. If all attempts fail, an empty array is returned and the error is logged to
 * stderr so callers always get a renderable result rather than a hard server error.
 */
export async function getPublishedPosts(): Promise<Post[]> {
  const filter = encodeURIComponent(JSON.stringify({ status: "published" }));
  const url = `${dataUrl()}?filter=${filter}&limit=100&sort=-publishedAt`;

  let lastStatus = 0;

  for (let attempt = 0; attempt <= FETCH_RETRIES; attempt++) {
    if (attempt > 0) {
      await retryDelay(RETRY_BASE_MS * attempt);
    }
    try {
      const res = await fetch(url, { next: { revalidate: 300 } });
      if (!res.ok) {
        lastStatus = res.status;
        continue;
      }
      const json = (await res.json()) as MudbaseListResponse<Post>;
      const posts = extractList(json);
      return posts
        .slice()
        .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
    } catch {
      // network error or response parse failure; will retry if attempts remain
    }
  }

  console.error(
    `[mudbase] getPublishedPosts: all ${FETCH_RETRIES + 1} attempts failed` +
      (lastStatus ? ` (last HTTP ${lastStatus})` : ""),
  );
  return [];
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const posts = await getPublishedPosts();
  return posts.find((post) => post.slug === slug) ?? null;
}

export async function getPostsByCategory(category: string): Promise<Post[]> {
  const posts = await getPublishedPosts();
  return posts.filter((post) => post.category === category);
}

/**
 * The distinct categories, sorted for a stable render, for the header's category navigation.
 * Derived from the live posts rather than hard-coded so the nav can never advertise a category the
 * content doesn't carry (or miss one it does).
 */
export async function getCategories(): Promise<string[]> {
  const posts = await getPublishedPosts();
  return Array.from(new Set(posts.map((post) => post.category))).sort((a, b) =>
    a.localeCompare(b),
  );
}

/**
 * Curated lead slot for the home page, highest priority first.
 *
 * The CMS schema has no `featured` field, so rather than force a schema change we pin the featured
 * card to a hand-picked post instead of whatever happens to be newest. Update this list to re-point
 * the lead slot. If none of these slugs are currently published, `pickFeaturedPost` falls back to
 * the most recent post.
 *
 * The lead is currently the "Best Supabase alternatives" guide - a high-value evergreen SEO piece
 * we want to greet every visitor, ahead of the customer-outcome stories that back it up.
 */
export const FEATURED_SLUGS = [
  "best-supabase-alternatives-in-2026",
  "viteg-shipped-to-the-app-stores-on-mudbase",
  "greatmindsng-consolidating-onto-mudbase",
] as const;

/** Resolve the curated featured post, falling back to the newest post when none are published. */
export function pickFeaturedPost(posts: Post[]): Post | undefined {
  for (const slug of FEATURED_SLUGS) {
    const match = posts.find((post) => post.slug === slug);
    if (match) return match;
  }
  return posts[0];
}

/** Words-per-minute used to estimate reading time from a post body. */
const WORDS_PER_MINUTE = 225;

/**
 * Estimate reading time in whole minutes from a post's markdown body. The CMS stores no reading
 * time, so we compute it from word count; markdown syntax is a small, consistent overcount that
 * washes out at this granularity. Always at least 1 minute.
 */
export function readingTimeMinutes(body: string): number {
  const words = (body ?? "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
