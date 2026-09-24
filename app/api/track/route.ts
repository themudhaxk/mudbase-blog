import { NextResponse, type NextRequest } from "next/server";
import { recordPageview } from "@/lib/analytics";

export const dynamic = "force-dynamic";

/**
 * POST /api/track
 *
 * Records a pageview for an article. Called client-side on mount so SSR revalidations and
 * crawlers do not inflate the count.
 *
 * Body: { postId: string }
 * Returns 204 on success, 400 on bad input, 503 when analytics are unconfigured.
 *
 * Bot filtering: requests whose User-Agent matches a known crawler pattern are silently
 * accepted (204) but not recorded. This is intentionally lightweight; it handles the
 * common automated traffic, not adversarial spoofing.
 *
 * Rate limiting: 10 requests per minute per IP using an in-memory sliding window.
 * Scope is a single Vercel function instance; counters reset on cold start and are not
 * shared across concurrent instances. Sufficient for a blog analytics endpoint where the
 * threat model is sustained single-IP abuse within a warm window.
 *
 * postId validation: Mudbase document IDs are 24-character hex strings. Requests with
 * any other format are silently rejected (204) to prevent collection pollution.
 */

// ---------------------------------------------------------------------------
// Bot UA filter
// ---------------------------------------------------------------------------

const BOT_UA_PATTERN =
  /bot|spider|crawl|slurp|headless|prerender|googlebot|bingbot|yandex|baidu|duckduckbot|facebookexternalhit|twitterbot|linkedinbot|slackbot|whatsapp|pinterest|embedly|applebot|semrush|ahrefs/i;

function isBot(ua: string | null): boolean {
  if (!ua) return false;
  return BOT_UA_PATTERN.test(ua);
}

// ---------------------------------------------------------------------------
// In-memory sliding window rate limiter
// ---------------------------------------------------------------------------

const RATE_WINDOW_MS = 60_000; // 1 minute
const RATE_MAX = 10; // max requests per window per IP

// Map from IP to the list of hit timestamps within the current window.
const ipHits = new Map<string, number[]>();

// Prune stale entries every 30 seconds to prevent unbounded Map growth in a warm instance.
let lastPrune = Date.now();
function maybePrune(): void {
  const now = Date.now();
  if (now - lastPrune < 30_000) return;
  lastPrune = now;
  const cutoff = now - RATE_WINDOW_MS;
  for (const [ip, hits] of ipHits) {
    const alive = hits.filter((t) => t > cutoff);
    if (alive.length === 0) ipHits.delete(ip);
    else ipHits.set(ip, alive);
  }
}

/**
 * Returns true if this request from `ip` exceeds the rate limit.
 * Always records the hit before returning.
 */
function isRateLimited(ip: string): boolean {
  maybePrune();
  const now = Date.now();
  const cutoff = now - RATE_WINDOW_MS;
  const prev = (ipHits.get(ip) ?? []).filter((t) => t > cutoff);
  prev.push(now);
  ipHits.set(ip, prev);
  return prev.length > RATE_MAX;
}

// ---------------------------------------------------------------------------
// postId format validation
// ---------------------------------------------------------------------------

// Mudbase document IDs are 24-character lowercase hex strings (MongoDB ObjectId format).
const POST_ID_RE = /^[0-9a-f]{24}$/i;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ua = request.headers.get("user-agent");
  if (isBot(ua)) {
    // Return 204 so the client does not retry, but do not record the view.
    return new NextResponse(null, { status: 204 });
  }

  // Extract IP from x-forwarded-for (set by Vercel's edge).
  const ip =
    (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (isRateLimited(ip)) {
    // Silent 204: the client should not retry; we just drop the request.
    return new NextResponse(null, { status: 204 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const postId =
    body !== null &&
    typeof body === "object" &&
    "postId" in body &&
    typeof (body as { postId: unknown }).postId === "string"
      ? (body as { postId: string }).postId.trim()
      : "";

  if (!postId) {
    return NextResponse.json({ error: "postId is required" }, { status: 400 });
  }

  // Reject anything that is not a 24-char hex string: prevents collection pollution
  // from arbitrary postId values while adding zero latency (no extra API call needed).
  if (!POST_ID_RE.test(postId)) {
    return new NextResponse(null, { status: 204 });
  }

  try {
    await recordPageview(postId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Missing required env vars: tell the operator clearly without leaking internals.
    if (
      msg.includes("MUDBASE_PAGEVIEWS_COLLECTION_ID") ||
      msg.includes("MUDBASE_PROJECT_ID")
    ) {
      return NextResponse.json({ error: "Analytics not configured" }, { status: 503 });
    }
    // Any other upstream failure: swallow and return 204 rather than surfacing an error to the
    // reader's browser. A failed analytics write is never worth a visible error.
    console.error("[analytics] recordPageview failed:", msg);
    return new NextResponse(null, { status: 204 });
  }

  return new NextResponse(null, { status: 204 });
}
