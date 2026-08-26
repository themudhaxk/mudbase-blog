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

export async function getPublishedPosts(): Promise<Post[]> {
  const filter = encodeURIComponent(JSON.stringify({ status: "published" }));
  const url = `${dataUrl()}?filter=${filter}&limit=100&sort=-publishedAt`;

  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) {
    throw new Error(`Failed to load posts: ${res.status}`);
  }

  const json = (await res.json()) as MudbaseListResponse<Post>;
  const posts = extractList(json);
  return posts
    .slice()
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const posts = await getPublishedPosts();
  return posts.find((post) => post.slug === slug) ?? null;
}

export async function getPostsByCategory(category: string): Promise<Post[]> {
  const posts = await getPublishedPosts();
  return posts.filter((post) => post.category === category);
}
