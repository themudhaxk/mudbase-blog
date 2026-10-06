import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminPostsList } from "@/components/admin/posts-list";
import { AdminApiError, listAllPosts } from "@/lib/mudbase-admin";
import type { Post } from "@/lib/mudbase";

export const dynamic = "force-dynamic";

export default async function AdminIndexPage(): Promise<React.JSX.Element> {
  let posts: Post[] = [];
  let error: string | null = null;
  try {
    posts = await listAllPosts();
  } catch (e) {
    error = e instanceof AdminApiError ? e.message : "Could not load posts.";
  }

  const drafts = posts.filter((p) => p.status !== "published");
  const published = posts.filter((p) => p.status === "published");

  return (
    <AdminShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink-950 dark:text-ink-50">Posts</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            {published.length} published · {drafts.length} draft{drafts.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/analytics"
            className="rounded border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-700 hover:border-mud-600 hover:text-mud-600 dark:border-ink-700 dark:bg-ink-900/40 dark:text-ink-300 dark:hover:border-mud-400 dark:hover:text-mud-300"
          >
            Analytics
          </Link>
          <Link
            href="/admin/new"
            className="rounded bg-mud-600 px-4 py-2 text-sm font-semibold text-white hover:bg-mud-500"
          >
            New post
          </Link>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </p>
      )}

      {!error && <AdminPostsList posts={posts} />}
    </AdminShell>
  );
}
