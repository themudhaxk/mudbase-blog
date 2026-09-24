import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { SiteTrendChart } from "@/components/admin/site-trend-chart";
import { PostAnalyticsTable } from "@/components/admin/post-analytics-table";
import type { PostAnalyticsRow } from "@/components/admin/post-analytics-table";
import { AdminApiError, listAllPosts } from "@/lib/mudbase-admin";
import { getSiteAnalytics, getAllPostsAnalytics } from "@/lib/analytics";
import type { Post } from "@/lib/mudbase";

export const dynamic = "force-dynamic";

type FetchResult =
  | {
      ok: true;
      posts: Post[];
      site: Awaited<ReturnType<typeof getSiteAnalytics>>;
      perPost: Awaited<ReturnType<typeof getAllPostsAnalytics>>;
    }
  | { ok: false; unconfigured: boolean; message: string };

async function loadData(): Promise<FetchResult> {
  try {
    const [posts, site, perPost] = await Promise.all([
      listAllPosts(),
      getSiteAnalytics(),
      getAllPostsAnalytics(),
    ]);
    return { ok: true, posts, site, perPost };
  } catch (err) {
    const msg = err instanceof AdminApiError ? err.message : String(err);
    const unconfigured =
      msg.includes("MUDBASE_PAGEVIEWS_COLLECTION_ID") ||
      msg.includes("MUDBASE_API_KEY") ||
      msg.includes("Analytics collection not configured");
    return { ok: false, unconfigured, message: msg };
  }
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

function formatDate(d: string): string {
  return new Date(d + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default async function AnalyticsPage(): Promise<React.JSX.Element> {
  const data = await loadData();

  if (!data.ok) {
    return (
      <AdminShell>
        <div className="mb-6">
          <h1 className="font-display text-2xl text-ink-950 dark:text-ink-50">Analytics</h1>
        </div>
        {data.unconfigured ? (
          <UnconfiguredState />
        ) : (
          <ErrorState message={data.message} />
        )}
      </AdminShell>
    );
  }

  const { posts, site, perPost } = data;

  // Summary stats
  const totalViews30d = site.totalViews;
  const avgDaily =
    site.daily.length > 0 ? Math.round(totalViews30d / 30) : 0;

  const peakDay =
    site.daily.length > 0
      ? site.daily.reduce((best, d) => (d.count > best.count ? d : best), site.daily[0])
      : null;

  // 7-day cutoff for "last 7 days" per post
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);
  const cutoff7d = sevenDaysAgo.toISOString().slice(0, 10);

  // Build per-post table rows
  const rows: PostAnalyticsRow[] = posts.map((post) => {
    const stats = perPost.get(post._id);
    const totalPostViews = stats?.totalViews ?? 0;
    const last7Days = (stats?.trend30d ?? [])
      .filter((d) => d.date >= cutoff7d)
      .reduce((sum, d) => sum + d.count, 0);

    return {
      postId: post._id,
      title: post.title,
      slug: post.slug,
      status: post.status,
      totalViews: totalPostViews,
      last7Days,
      trend30d: stats?.trend30d ?? [],
      trendFrom: site.from,
      trendTo: site.to,
    };
  });

  // "Most read this month" - top 3 by totalViews in range
  const top3 = [...rows]
    .filter((r) => r.totalViews > 0)
    .sort((a, b) => b.totalViews - a.totalViews)
    .slice(0, 3);

  return (
    <AdminShell>
      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink-950 dark:text-ink-50">Analytics</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            Last 30 days: {formatDate(site.from)} to {formatDate(site.to)}
          </p>
        </div>
        <Link
          href="/admin"
          className="text-sm text-ink-500 hover:text-mud-600 dark:text-ink-400 dark:hover:text-mud-300"
        >
          Back to posts
        </Link>
      </div>

      {/* Empty state - collection configured but no data yet */}
      {totalViews30d === 0 && posts.length > 0 && (
        <div className="mb-8 rounded-lg border border-dashed border-ink-300 bg-white px-6 py-8 text-center dark:border-ink-700 dark:bg-ink-900/40">
          <p className="text-sm font-medium text-ink-700 dark:text-ink-300">
            No pageviews recorded yet
          </p>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            The analytics collection is set up. Views will appear here as posts receive traffic.
          </p>
        </div>
      )}

      {/* Summary cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Total views (30 days)"
          value={formatNumber(totalViews30d)}
          sub={totalViews30d === 0 ? "No data yet" : "across all posts"}
        />
        <StatCard
          label="Avg daily views"
          value={formatNumber(avgDaily)}
          sub="over 30 days"
        />
        <StatCard
          label="Peak day"
          value={peakDay ? formatNumber(peakDay.count) : "0"}
          sub={peakDay ? formatDate(peakDay.date) : "no data yet"}
        />
        <StatCard
          label="Total posts"
          value={String(posts.length)}
          sub={`${posts.filter((p) => p.status === "published").length} published`}
        />
      </div>

      {/* Main trend chart */}
      {totalViews30d > 0 && (
        <div className="mb-8 rounded-lg border border-ink-200 bg-white p-4 dark:border-ink-700 dark:bg-ink-900/40">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-100">
              Daily pageviews
            </h2>
            <span className="text-xs text-ink-400">30-day window</span>
          </div>
          <SiteTrendChart daily={site.daily} from={site.from} to={site.to} />
        </div>
      )}

      {/* Most read this period */}
      {top3.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 font-display text-base font-semibold text-ink-900 dark:text-ink-100">
            Most read (30 days)
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {top3.map((row, rank) => (
              <MostReadCard key={row.postId} row={row} rank={rank + 1} />
            ))}
          </div>
        </div>
      )}

      {/* Per-article table */}
      <div>
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-100">
            All posts
          </h2>
          <span className="text-xs text-ink-400">Click column headers to sort</span>
        </div>
        <PostAnalyticsTable rows={rows} />
      </div>
    </AdminShell>
  );
}

// ---- Sub-components ----

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}): React.JSX.Element {
  return (
    <div className="rounded-lg border border-ink-200 bg-white px-4 py-4 dark:border-ink-700 dark:bg-ink-900/40">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-500 dark:text-ink-400">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl font-semibold tabular-nums text-ink-950 dark:text-ink-50">
        {value}
      </p>
      <p className="mt-1 text-xs text-ink-400 dark:text-ink-500">{sub}</p>
    </div>
  );
}

function MostReadCard({
  row,
  rank,
}: {
  row: PostAnalyticsRow;
  rank: number;
}): React.JSX.Element {
  return (
    <div className="rounded-lg border border-ink-200 bg-white px-4 py-4 dark:border-ink-700 dark:bg-ink-900/40">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-mud-600/10 text-xs font-semibold text-mud-600 dark:bg-mud-500/15 dark:text-mud-300">
          {rank}
        </span>
        <span className="text-xs font-medium uppercase tracking-wide text-ink-500 dark:text-ink-400">
          #{rank} this period
        </span>
      </div>
      <p className="line-clamp-2 text-sm font-medium text-ink-900 dark:text-ink-100">
        {row.title || "(untitled)"}
      </p>
      <p className="mt-2 font-display text-xl font-semibold tabular-nums text-ink-950 dark:text-ink-50">
        {row.totalViews.toLocaleString()}
        <span className="ml-1 text-sm font-normal text-ink-400">views</span>
      </p>
    </div>
  );
}

function UnconfiguredState(): React.JSX.Element {
  return (
    <div className="rounded-lg border border-dashed border-ink-300 bg-white px-6 py-12 dark:border-ink-700 dark:bg-ink-900/40">
      <div className="mx-auto max-w-md text-center">
        <p className="font-display text-lg text-ink-900 dark:text-ink-100">
          Analytics not yet configured
        </p>
        <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">
          To enable analytics, create a collection in your project and set the
          <code className="mx-1 rounded bg-ink-100 px-1.5 py-0.5 font-mono text-xs text-clay-600 dark:bg-ink-800 dark:text-clay-400">
            MUDBASE_PAGEVIEWS_COLLECTION_ID
          </code>
          environment variable, then redeploy.
        </p>
        <p className="mt-3 text-xs text-ink-400 dark:text-ink-500">
          The collection needs documents with fields:
          <code className="ml-1 font-mono">postId</code>,{" "}
          <code className="font-mono">date</code> (YYYY-MM-DD), and{" "}
          <code className="font-mono">count</code>.
        </p>
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }): React.JSX.Element {
  return (
    <div
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 px-4 py-4 dark:border-red-800 dark:bg-red-950/40"
    >
      <p className="text-sm font-medium text-red-700 dark:text-red-300">
        Could not load analytics
      </p>
      <p className="mt-1 font-mono text-xs text-red-500 dark:text-red-400 break-all">{message}</p>
    </div>
  );
}
