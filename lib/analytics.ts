/**
 * Server-side pageview analytics backed by a dedicated Mudbase collection.
 *
 * Pageviews are stored as daily buckets: one document per (postId, date) pair.
 * Each document tracks the view count for that article on that day.
 *
 * Document shape in the pageviews collection:
 *   { _id, postId: string, date: string (YYYY-MM-DD), count: number }
 *
 * Required env var: MUDBASE_PAGEVIEWS_COLLECTION_ID
 * (Create a new collection in the same Mudbase project and set this to its ID.)
 */

const API_BASE = process.env.MUDBASE_API_BASE ?? "https://api.mudbase.dev";
const PROJECT_ID = process.env.MUDBASE_PROJECT_ID ?? "6a8b001ccd3ed654823a5732";

function pvCollectionId(): string {
  const id = process.env.MUDBASE_PAGEVIEWS_COLLECTION_ID;
  if (!id) throw new Error("MUDBASE_PAGEVIEWS_COLLECTION_ID is not configured");
  return id;
}

function apiKey(): string {
  const key = process.env.MUDBASE_API_KEY;
  if (!key) throw new Error("MUDBASE_API_KEY is not configured");
  return key;
}

function dataUrl(docId?: string): string {
  const base = `${API_BASE}/api/data/projects/${PROJECT_ID}/collections/${pvCollectionId()}/data`;
  return docId ? `${base}/${encodeURIComponent(docId)}` : base;
}

async function apiFetch<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey(),
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  const text = await res.text();
  let body: unknown = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = {};
  }

  if (!res.ok) {
    throw new Error(`Analytics API responded with ${res.status}`);
  }
  return body as T;
}

export interface PageviewBucket {
  _id: string;
  postId: string;
  date: string;
  count: number;
}

interface ListResponse {
  data?: PageviewBucket[];
  items?: PageviewBucket[];
  documents?: PageviewBucket[];
}

function extractList(json: ListResponse): PageviewBucket[] {
  return json.data ?? json.items ?? json.documents ?? [];
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Increment the daily bucket for a post by 1.
 * Creates the bucket document if none exists for today, otherwise patches the existing count.
 *
 * Not atomic. For a blog analytics counter, approximate counts under concurrent load are
 * acceptable; the cost of a true read-modify-write race is one missed view on a spike day.
 */
export async function recordPageview(postId: string): Promise<void> {
  const date = todayUtc();
  const filter = encodeURIComponent(JSON.stringify({ postId, date }));
  const listUrl = `${dataUrl()}?filter=${filter}&limit=1`;

  const existing = extractList(await apiFetch<ListResponse>(listUrl, { method: "GET" }));

  if (existing.length > 0) {
    const bucket = existing[0];
    await apiFetch<unknown>(dataUrl(bucket._id), {
      method: "PATCH",
      body: JSON.stringify({ count: bucket.count + 1 }),
    });
  } else {
    await apiFetch<unknown>(dataUrl(), {
      method: "POST",
      body: JSON.stringify({ postId, date, count: 1 }),
    });
  }
}

export interface PostAnalytics {
  postId: string;
  totalViews: number;
  trend: { date: string; count: number }[];
}

/**
 * Return all-time total views and a per-day trend for the past `days` days (default 30).
 */
export async function getPostAnalytics(postId: string, days = 30): Promise<PostAnalytics> {
  const filter = encodeURIComponent(JSON.stringify({ postId }));
  const listUrl = `${dataUrl()}?filter=${filter}&limit=1000`;
  const buckets = extractList(await apiFetch<ListResponse>(listUrl, { method: "GET" }));

  const totalViews = buckets.reduce((sum, b) => sum + (b.count ?? 0), 0);

  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - days + 1);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const trend = buckets
    .filter((b) => b.date >= cutoffStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((b) => ({ date: b.date, count: b.count }));

  return { postId, totalViews, trend };
}

export interface SiteAnalytics {
  from: string;
  to: string;
  totalViews: number;
  daily: { date: string; count: number }[];
}

/**
 * Return a daily breakdown of all pageviews across all posts for a date range.
 *
 * When `from`/`to` are omitted, defaults to the trailing 30 days inclusive.
 *
 * Fetches all buckets in one call and filters by date range in memory. This is acceptable
 * for a blog: even at 200 posts * 365 days = 73,000 buckets/year, the payload is small.
 * If this collection grows very large, add server-side date filtering once Mudbase supports
 * range queries natively.
 */
export async function getSiteAnalytics(from?: string, to?: string): Promise<SiteAnalytics> {
  const now = new Date();
  const toDate = to ?? now.toISOString().slice(0, 10);

  let fromDate = from;
  if (!fromDate) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - 29);
    fromDate = d.toISOString().slice(0, 10);
  }

  const listUrl = `${dataUrl()}?limit=5000&sort=date`;
  const buckets = extractList(await apiFetch<ListResponse>(listUrl, { method: "GET" }));

  const inRange = buckets.filter((b) => b.date >= fromDate! && b.date <= toDate);

  const byDate = new Map<string, number>();
  for (const b of inRange) {
    byDate.set(b.date, (byDate.get(b.date) ?? 0) + (b.count ?? 0));
  }

  const daily = Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  const totalViews = daily.reduce((sum, d) => sum + d.count, 0);

  return { from: fromDate!, to: toDate, totalViews, daily };
}
