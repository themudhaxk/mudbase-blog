import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { getPostAnalytics } from "@/lib/analytics";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/analytics/post?postId=:id&days=:n
 *
 * Per-article analytics: all-time total views and a daily trend for the past N days.
 *
 * Query params:
 *   postId  string  Required. The Mudbase _id of the Post document.
 *   days    number  Optional. Number of trailing days for the trend. Defaults to 30.
 *
 * Response 200:
 * {
 *   postId: string,          // echoed back from the request
 *   totalViews: number,      // all-time view count for this post
 *   trend: [                 // one entry per calendar date in the range with at least one view
 *     { date: string, count: number },
 *     ...
 *   ]
 * }
 *
 * Dates with zero views are omitted. The dashboard fills gaps when drawing a continuous chart.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { searchParams } = request.nextUrl;
  const postId = searchParams.get("postId")?.trim() ?? "";
  if (!postId) {
    return NextResponse.json({ error: "postId is required" }, { status: 400 });
  }

  const daysRaw = searchParams.get("days");
  const days = daysRaw ? parseInt(daysRaw, 10) : 30;
  if (!Number.isFinite(days) || days < 1 || days > 365) {
    return NextResponse.json({ error: "days must be between 1 and 365" }, { status: 400 });
  }

  try {
    const stats = await getPostAnalytics(postId, days);
    return NextResponse.json(stats);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("MUDBASE_PAGEVIEWS_COLLECTION_ID")) {
      return NextResponse.json({ error: "Analytics collection not configured" }, { status: 503 });
    }
    console.error("[analytics] getPostAnalytics failed:", msg);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
