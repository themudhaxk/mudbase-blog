import Link from "next/link";
import { format } from "date-fns";
import { AdminShell } from "@/components/admin/admin-shell";
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
        <Link
          href="/admin/new"
          className="rounded bg-mud-600 px-4 py-2 text-sm font-semibold text-white hover:bg-mud-500"
        >
          New post
        </Link>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </p>
      )}

      {!error && posts.length === 0 && (
        <p className="rounded border border-dashed border-ink-300 px-4 py-10 text-center text-sm text-ink-500 dark:border-ink-700 dark:text-ink-400">
          No posts yet. Write the first one.
        </p>
      )}

      {posts.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-ink-200 dark:border-ink-700">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500 dark:bg-ink-900 dark:text-ink-400">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Title</th>
                <th className="px-4 py-2.5 font-semibold">Category</th>
                <th className="px-4 py-2.5 font-semibold">Date</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-200 bg-white dark:divide-ink-800 dark:bg-ink-900/40">
              {posts.map((post) => (
                <tr key={post._id} className="hover:bg-ink-50 dark:hover:bg-ink-900">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/edit/${post._id}`}
                      className="font-medium text-ink-900 hover:text-mud-600 dark:text-ink-100 dark:hover:text-mud-300"
                    >
                      {post.title || "(untitled)"}
                    </Link>
                    <div className="mt-0.5 font-mono text-xs text-ink-400">/{post.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-ink-600 dark:text-ink-300">{post.category}</td>
                  <td className="px-4 py-3 text-ink-600 dark:text-ink-300">
                    {formatDate(post.publishedAt || post.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={post.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}

function formatDate(value: string | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : format(parsed, "d MMM yyyy");
}

function StatusPill({ status }: { status: string }): React.JSX.Element {
  const published = status === "published";
  return (
    <span
      className={
        published
          ? "rounded-full bg-mud-600/10 px-2 py-0.5 text-xs font-medium text-mud-600 dark:bg-mud-500/15 dark:text-mud-300"
          : "rounded-full bg-ink-500/10 px-2 py-0.5 text-xs font-medium text-ink-500 dark:bg-ink-100/10 dark:text-ink-300"
      }
    >
      {published ? "Published" : "Draft"}
    </span>
  );
}
