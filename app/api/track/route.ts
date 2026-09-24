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
 */

const BOT_UA_PATTERN =
  /bot|spider|crawl|slurp|headless|prerender|googlebot|bingbot|yandex|baidu|duckduckbot|facebookexternalhit|twitterbot|linkedinbot|slackbot|whatsapp|pinterest|embedly|applebot|semrush|ahrefs/i;

function isBot(ua: string | null): boolean {
  if (!ua) return false;
  return BOT_UA_PATTERN.test(ua);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ua = request.headers.get("user-agent");
  if (isBot(ua)) {
    // Return 204 so the client does not retry, but do not record the view.
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

  try {
    await recordPageview(postId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Misconfigured collection - tell the operator clearly without leaking internals.
    if (msg.includes("MUDBASE_PAGEVIEWS_COLLECTION_ID")) {
      return NextResponse.json({ error: "Analytics not configured" }, { status: 503 });
    }
    // Any other upstream failure: swallow and return 204 rather than surfacing an error to the
    // reader's browser. A failed analytics write is never worth a visible error.
    console.error("[analytics] recordPageview failed:", msg);
    return new NextResponse(null, { status: 204 });
  }

  return new NextResponse(null, { status: 204 });
}
