import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { getSiteAnalytics } from "@/lib/analytics";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/analytics
 *
 * Site-wide analytics overview: total views and a daily breakdown for a date range.
 *
 * Query params:
 *   from  YYYY-MM-DD  Start of the range (inclusive). Defaults to 30 days ago.
 *   to    YYYY-MM-DD  End of the range (inclusive). Defaults to today.
 *
 * Response 200:
 * {
 *   from: string,           // YYYY-MM-DD, start of range
 *   to: string,             // YYYY-MM-DD, end of range
 *   totalViews: number,     // sum of all views across all posts in the range
 *   daily: [                // one entry per calendar date that has at least one view
 *     { date: string, count: number },
 *     ...
 *   ]
 * }
 *
 * Dates with zero views are omitted from the daily array to keep the payload small.
 * The dashboard should fill gaps when drawing a continuous chart.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { searchParams } = request.nextUrl;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  if (from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) {
    return NextResponse.json({ error: "from must be YYYY-MM-DD" }, { status: 400 });
  }
  if (to && !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return NextResponse.json({ error: "to must be YYYY-MM-DD" }, { status: 400 });
  }

  try {
    const stats = await getSiteAnalytics(from, to);
    return NextResponse.json(stats);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("MUDBASE_PAGEVIEWS_COLLECTION_ID")) {
      return NextResponse.json({ error: "Analytics collection not configured" }, { status: 503 });
    }
    console.error("[analytics] getSiteAnalytics failed:", msg);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
