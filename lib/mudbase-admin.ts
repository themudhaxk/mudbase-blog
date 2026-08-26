import type { Post } from "@/lib/mudbase";

/**
 * Server-only write access to the posts collection.
 *
 * The API key lives here and nowhere else. Every mutation goes through a Next route handler
 * that calls into this module, so the key is never serialised to the browser — a blog admin
 * that shipped a write-capable Mudbase key to the client would hand every visitor the ability
 * to edit posts.
 */

const API_BASE = process.env.MUDBASE_API_BASE ?? "https://api.mudbase.dev";
const PROJECT_ID = process.env.MUDBASE_PROJECT_ID ?? "6a8b001ccd3ed654823a5732";
const COLLECTION_ID = process.env.MUDBASE_COLLECTION_ID ?? "6a8b005ccd3ed654823a5743";

export class AdminApiError extends Error {
  readonly status: number;
  /** Machine-readable detail from the API, e.g. the 409 duplicate_key payload. */
  readonly detail: Record<string, unknown>;
  constructor(message: string, status = 500, detail: Record<string, unknown> = {}) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

function apiKey(): string {
  const key = process.env.MUDBASE_API_KEY;
  if (!key) {
    throw new AdminApiError(
      "MUDBASE_API_KEY is not configured — the blog admin cannot write posts.",
      503,
    );
  }
  return key;
}

function dataUrl(id?: string): string {
  const base = `${API_BASE}/api/data/projects/${PROJECT_ID}/collections/${COLLECTION_ID}/data`;
  return id ? `${base}/${encodeURIComponent(id)}` : base;
}

function messageFrom(body: unknown, status: number): string {
  const b = body as { error?: unknown; message?: unknown; details?: unknown } | null;
  const candidate = b?.error ?? b?.message ?? b?.details;
  return typeof candidate === "string" && candidate.trim()
    ? candidate
    : `Request failed (${status})`;
}

async function call<T>(url: string, init: RequestInit): Promise<T> {
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
    body = { error: text.slice(0, 300) };
  }

  if (!res.ok) {
    // Carry the API's own fields through (code, field, value) so callers can react to a
    // specific failure instead of only seeing a sentence.
    throw new AdminApiError(messageFrom(body, res.status), res.status, (body ?? {}) as Record<string, unknown>);
  }
  return body as T;
}

interface ListResponse {
  data?: Post[];
  items?: Post[];
  documents?: Post[];
}

/** Every post including drafts — the public reader only ever sees `status: "published"`. */
export async function listAllPosts(): Promise<Post[]> {
  const json = await call<ListResponse>(`${dataUrl()}?limit=200`, { method: "GET" });
  const posts = json.data ?? json.items ?? json.documents ?? [];
  // Newest first, by publish date where present so scheduled/backdated posts sort sensibly,
  // falling back to creation time for drafts that have never had a date set.
  return posts
    .slice()
    .sort((a, b) => (postSortKey(a) < postSortKey(b) ? 1 : -1));
}

function postSortKey(post: Post): string {
  return String(post.publishedAt || post.createdAt || "");
}

export async function getPostById(id: string): Promise<Post | null> {
  const posts = await listAllPosts();
  return posts.find((p) => p._id === id) ?? null;
}

export interface PostInput {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  coverImage: string;
  category: string;
  author: string;
  status: "draft" | "published";
  publishedAt: string;
}

export async function createPost(input: PostInput): Promise<Post> {
  return call<Post>(dataUrl(), { method: "POST", body: JSON.stringify(input) });
}

export async function updatePost(id: string, input: Partial<PostInput>): Promise<Post> {
  return call<Post>(dataUrl(id), { method: "PATCH", body: JSON.stringify(input) });
}

export async function deletePost(id: string): Promise<void> {
  await call<unknown>(dataUrl(id), { method: "DELETE" });
}

/* ------------------------------------------------------------------ */
/* Image upload                                                        */
/* ------------------------------------------------------------------ */

interface BucketSummary {
  id: string;
  name: string;
  isPublic: boolean;
}

/**
 * Resolved once per server process. Bucket membership does not change between deploys, and
 * re-listing buckets on every image upload would add a round trip to each one.
 */
let cachedBucketId: string | null = null;

async function resolveBucketId(): Promise<string> {
  const configured = process.env.MUDBASE_BUCKET_ID;
  if (configured) return configured;
  if (cachedBucketId) return cachedBucketId;

  const json = await call<{ buckets?: BucketSummary[] }>(
    `${API_BASE}/api/bucket/projects/${PROJECT_ID}/buckets?limit=100`,
    { method: "GET" },
  );
  const buckets = json.buckets ?? [];
  // Cover images are served from /api/files/public/<id>, which only resolves for public
  // objects — uploading into a private bucket would produce a URL that 403s for readers.
  const target = buckets.find((b) => b.isPublic);
  if (!target) {
    throw new AdminApiError(
      "No public storage bucket found in this project. Create one, or set MUDBASE_BUCKET_ID.",
      503,
    );
  }
  cachedBucketId = target.id;
  return target.id;
}

/** Upload an image and return the public URL to insert into a post. */
export async function uploadImage(file: File): Promise<string> {
  const bucketId = await resolveBucketId();

  const form = new FormData();
  form.append("files", file); // the route reads req.files (multer .array), not a single field
  form.append("isPublic", "true");

  const res = await fetch(
    `${API_BASE}/api/bucket/projects/${PROJECT_ID}/buckets/${bucketId}/files`,
    {
      method: "POST",
      headers: { "X-API-Key": apiKey() }, // no Content-Type: fetch must set the multipart boundary
      body: form,
      cache: "no-store",
    },
  );

  const text = await res.text();
  let body: { files?: { id?: string; url?: string }[] } = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    /* handled by the status check below */
  }
  if (!res.ok) throw new AdminApiError(messageFrom(body, res.status), res.status);

  const uploaded = body.files?.[0];
  if (uploaded?.url) return uploaded.url;
  if (uploaded?.id) return `${API_BASE}/api/files/public/${uploaded.id}`;
  throw new AdminApiError("Upload succeeded but returned no file reference", 502);
}
