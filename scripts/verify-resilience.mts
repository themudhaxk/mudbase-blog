/**
 * Verifies the fetch-resilience behaviour of getPublishedPosts().
 *
 * Simulates transient API failures (non-2xx responses and network errors) and
 * asserts that the function degrades to an empty array rather than throwing,
 * so the blog pages always render instead of showing a raw error page.
 *
 * Also verifies the retry path: a single transient failure followed by a
 * successful response should yield the full post list.
 *
 * Run with: npm run verify:resilience
 *
 * Note: the test accepts ~3-4 seconds of real delay because the retry logic
 * uses live setTimeout calls. That is intentional - the delays are part of the
 * production behaviour being verified.
 */

import { getPublishedPosts } from "../lib/mudbase.ts";

const originalFetch = globalThis.fetch;

let failed = 0;

function check(name: string, ok: boolean, detail = ""): void {
  if (ok) {
    console.log(`  ok  ${name}`);
    return;
  }
  failed += 1;
  console.error(`FAIL  ${name}${detail ? ` -- ${detail}` : ""}`);
}

function makeFetch(
  responses: Array<{ status: number; body?: unknown } | "network-error">,
): () => Promise<Response> {
  let call = 0;
  return async (): Promise<Response> => {
    const spec = responses[Math.min(call, responses.length - 1)];
    call += 1;
    if (spec === "network-error") {
      throw new Error("Simulated network error");
    }
    const body = spec.body !== undefined ? JSON.stringify(spec.body) : null;
    return new Response(body, { status: spec.status });
  };
}

// -------------------------------------------------------------------------
// Test 1: all attempts return HTTP 500 -> must return [] without throwing
// -------------------------------------------------------------------------
console.log("\nTest 1: all attempts return HTTP 500");
(globalThis as { fetch: unknown }).fetch = makeFetch([
  { status: 500 },
  { status: 500 },
  { status: 500 },
]);

{
  let threw = false;
  let result: unknown[] = [];
  try {
    result = await getPublishedPosts();
  } catch {
    threw = true;
  }
  check("does not throw on HTTP 500", !threw);
  check("returns empty array on HTTP 500", Array.isArray(result) && result.length === 0, `got ${JSON.stringify(result)}`);
}

// -------------------------------------------------------------------------
// Test 2: all attempts throw a network error -> must return [] without throwing
// -------------------------------------------------------------------------
console.log("\nTest 2: all attempts throw a network error");
(globalThis as { fetch: unknown }).fetch = makeFetch([
  "network-error",
  "network-error",
  "network-error",
]);

{
  let threw = false;
  let result: unknown[] = [];
  try {
    result = await getPublishedPosts();
  } catch {
    threw = true;
  }
  check("does not throw on network error", !threw);
  check("returns empty array on network error", Array.isArray(result) && result.length === 0, `got ${JSON.stringify(result)}`);
}

// -------------------------------------------------------------------------
// Test 3: first attempt fails, second succeeds -> retry returns posts
// -------------------------------------------------------------------------
console.log("\nTest 3: first attempt returns HTTP 503, second succeeds");

const mockPost = {
  _id: "aaa111bbb222ccc333ddd444",
  title: "Test Post",
  slug: "test-post",
  excerpt: "An excerpt.",
  body: "Body text.",
  coverImage: "https://example.com/cover.jpg",
  category: "Engineering",
  author: "Mudbase Team",
  status: "published",
  publishedAt: "2026-09-01T00:00:00.000Z",
};

(globalThis as { fetch: unknown }).fetch = makeFetch([
  { status: 503 },
  { status: 200, body: { data: [mockPost] } },
]);

{
  let threw = false;
  let result: unknown[] = [];
  try {
    result = await getPublishedPosts();
  } catch {
    threw = true;
  }
  check("does not throw when retry succeeds", !threw);
  check("returns posts when retry succeeds", Array.isArray(result) && result.length === 1, `got ${result.length} posts`);
  if (Array.isArray(result) && result.length > 0) {
    const post = result[0] as typeof mockPost;
    check("retry result contains the correct post", post.slug === "test-post", `slug=${post.slug}`);
  }
}

// -------------------------------------------------------------------------
// Test 4: normal 200 response -> posts are returned in descending order
// -------------------------------------------------------------------------
console.log("\nTest 4: normal 200 path still works");

const postsPayload = [
  { ...mockPost, _id: "1", slug: "older", publishedAt: "2026-08-01T00:00:00.000Z" },
  { ...mockPost, _id: "2", slug: "newer", publishedAt: "2026-09-01T00:00:00.000Z" },
];

(globalThis as { fetch: unknown }).fetch = makeFetch([
  { status: 200, body: { data: postsPayload } },
]);

{
  let threw = false;
  let result: unknown[] = [];
  try {
    result = await getPublishedPosts();
  } catch {
    threw = true;
  }
  check("does not throw on 200", !threw);
  check("returns both posts on 200", Array.isArray(result) && result.length === 2, `got ${result.length}`);
  if (Array.isArray(result) && result.length === 2) {
    const slugs = result.map((p) => (p as { slug: string }).slug);
    check("posts sorted newest first", slugs[0] === "newer" && slugs[1] === "older", `got ${slugs.join(", ")}`);
  }
}

// Restore original fetch
(globalThis as { fetch: unknown }).fetch = originalFetch;

if (failed > 0) {
  console.error(`\n${failed} resilience check(s) failed.`);
  process.exit(1);
}
console.log("\nAll resilience checks passed.");
