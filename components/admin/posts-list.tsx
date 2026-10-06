"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { PostRowActions } from "@/components/admin/post-row-actions";
import type { Post } from "@/lib/mudbase";

// ---- helpers -----------------------------------------------------------------

function formatDate(value: string | undefined): string {
  if (!value) return "-";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "-" : format(parsed, "d MMM yyyy");
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

function matchesSearch(post: Post, needle: string): boolean {
  if (!needle) return true;
  const q = needle.toLowerCase();
  return (
    (post.title ?? "").toLowerCase().includes(q) ||
    (post.slug ?? "").toLowerCase().includes(q) ||
    (post.category ?? "").toLowerCase().includes(q) ||
    (post.author ?? "").toLowerCase().includes(q) ||
    (post.excerpt ?? "").toLowerCase().includes(q) ||
    (post.body ?? "").toLowerCase().includes(q)
  );
}

type SortKey = "newest" | "oldest" | "title";

function sortKey(post: Post): string {
  return String(post.publishedAt || post.createdAt || "");
}

function sorted(posts: Post[], by: SortKey): Post[] {
  const copy = posts.slice();
  if (by === "title") {
    copy.sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));
  } else if (by === "oldest") {
    copy.sort((a, b) => (sortKey(a) < sortKey(b) ? -1 : sortKey(a) > sortKey(b) ? 1 : 0));
  } else {
    copy.sort((a, b) => (sortKey(a) > sortKey(b) ? -1 : sortKey(a) < sortKey(b) ? 1 : 0));
  }
  return copy;
}

const SELECT_CLASS =
  "rounded border border-ink-200 bg-white px-2.5 py-1.5 text-sm text-ink-700 dark:border-ink-700 dark:bg-ink-900/60 dark:text-ink-200 focus:outline-none focus:ring-2 focus:ring-mud-600/50";

// ---- inner component (uses useSearchParams) ----------------------------------

interface AdminPostsListInnerProps {
  posts: Post[];
}

function AdminPostsListInner({ posts }: AdminPostsListInnerProps): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [inputValue, setInputValue] = useState(() => searchParams.get("q") ?? "");
  const [debouncedQ, setDebouncedQ] = useState(inputValue);
  const [status, setStatus] = useState(() => searchParams.get("status") ?? "all");
  const [author, setAuthor] = useState(() => searchParams.get("author") ?? "");
  const [category, setCategory] = useState(() => searchParams.get("category") ?? "");
  const [dateFrom, setDateFrom] = useState(() => searchParams.get("from") ?? "");
  const [dateTo, setDateTo] = useState(() => searchParams.get("to") ?? "");
  const [sortBy, setSortBy] = useState<SortKey>(
    () => (searchParams.get("sort") as SortKey) ?? "newest",
  );

  // Debounce search input (220 ms)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = useCallback((value: string) => {
    setInputValue(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQ(value), 220);
  }, []);
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  // Mirror filter state to URL query string so it survives refresh and can be shared
  useEffect(() => {
    const p = new URLSearchParams();
    if (debouncedQ) p.set("q", debouncedQ);
    if (status && status !== "all") p.set("status", status);
    if (author) p.set("author", author);
    if (category) p.set("category", category);
    if (dateFrom) p.set("from", dateFrom);
    if (dateTo) p.set("to", dateTo);
    if (sortBy && sortBy !== "newest") p.set("sort", sortBy);
    const qs = p.toString();
    router.replace(qs ? `/admin?${qs}` : "/admin", { scroll: false });
  }, [debouncedQ, status, author, category, dateFrom, dateTo, sortBy, router]);

  // Distinct option lists derived from the full post set
  const authors = useMemo(
    () =>
      Array.from(new Set(posts.map((p) => p.author).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [posts],
  );
  const categories = useMemo(
    () =>
      Array.from(new Set(posts.map((p) => p.category).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [posts],
  );

  // Apply all filters then sort
  const visible = useMemo(() => {
    let result = posts;

    if (debouncedQ) result = result.filter((p) => matchesSearch(p, debouncedQ));
    if (status === "published") result = result.filter((p) => p.status === "published");
    else if (status === "draft") result = result.filter((p) => p.status !== "published");
    if (author) result = result.filter((p) => p.author === author);
    if (category) result = result.filter((p) => p.category === category);

    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      result = result.filter((p) => {
        const d = new Date(p.publishedAt || p.createdAt || "").getTime();
        return !Number.isNaN(d) && d >= from;
      });
    }
    if (dateTo) {
      // include the full end day
      const to = new Date(dateTo).getTime() + 86_399_999;
      result = result.filter((p) => {
        const d = new Date(p.publishedAt || p.createdAt || "").getTime();
        return !Number.isNaN(d) && d <= to;
      });
    }

    return sorted(result, sortBy);
  }, [posts, debouncedQ, status, author, category, dateFrom, dateTo, sortBy]);

  const hasFilters = Boolean(
    debouncedQ ||
      (status && status !== "all") ||
      author ||
      category ||
      dateFrom ||
      dateTo ||
      (sortBy && sortBy !== "newest"),
  );

  function clearAll(): void {
    setInputValue("");
    setDebouncedQ("");
    setStatus("all");
    setAuthor("");
    setCategory("");
    setDateFrom("");
    setDateTo("");
    setSortBy("newest");
  }

  return (
    <div>
      {/* Toolbar */}
      <div
        role="search"
        aria-label="Filter posts"
        className="mb-4 flex flex-wrap items-center gap-2"
      >
        {/* Search box */}
        <div className="relative min-w-[200px] flex-1">
          <label htmlFor="admin-search" className="sr-only">
            Search posts by title, slug, category, author, or text
          </label>
          <input
            id="admin-search"
            type="search"
            placeholder="Search posts..."
            value={inputValue}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full rounded border border-ink-200 bg-white py-1.5 pl-8 pr-3 text-sm text-ink-900 placeholder-ink-400 dark:border-ink-700 dark:bg-ink-900/60 dark:text-ink-100 dark:placeholder-ink-500 focus:outline-none focus:ring-2 focus:ring-mud-600/50"
          />
          {/* Search icon */}
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400 dark:text-ink-500"
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
          >
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M10.5 10.5 14 14"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Status filter */}
        <label htmlFor="admin-filter-status" className="sr-only">
          Filter by status
        </label>
        <select
          id="admin-filter-status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={SELECT_CLASS}
        >
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>

        {/* Category filter - only shown when multiple categories exist */}
        {categories.length > 0 && (
          <>
            <label htmlFor="admin-filter-category" className="sr-only">
              Filter by category
            </label>
            <select
              id="admin-filter-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </>
        )}

        {/* Author filter - only shown when more than one author */}
        {authors.length > 1 && (
          <>
            <label htmlFor="admin-filter-author" className="sr-only">
              Filter by author
            </label>
            <select
              id="admin-filter-author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">All authors</option>
              {authors.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </>
        )}

        {/* Date range */}
        <label htmlFor="admin-date-from" className="sr-only">
          From date
        </label>
        <input
          id="admin-date-from"
          type="date"
          aria-label="From date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className={SELECT_CLASS}
        />

        <label htmlFor="admin-date-to" className="sr-only">
          To date
        </label>
        <input
          id="admin-date-to"
          type="date"
          aria-label="To date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className={SELECT_CLASS}
        />

        {/* Sort */}
        <label htmlFor="admin-sort" className="sr-only">
          Sort posts
        </label>
        <select
          id="admin-sort"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          className={SELECT_CLASS}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="title">Title A-Z</option>
        </select>
      </div>

      {/* Result count and clear-all */}
      <div className="mb-3 flex items-center justify-between gap-2 text-sm text-ink-500 dark:text-ink-400">
        <span aria-live="polite" aria-atomic="true">
          {visible.length} {visible.length === 1 ? "post" : "posts"}
          {hasFilters ? " matching filters" : ""}
        </span>
        {hasFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="text-mud-600 hover:underline dark:text-mud-300"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Empty state */}
      {visible.length === 0 && (
        <p className="rounded border border-dashed border-ink-300 px-4 py-10 text-center text-sm text-ink-500 dark:border-ink-700 dark:text-ink-400">
          {hasFilters
            ? "No posts match the current filters."
            : "No posts yet. Write the first one."}
        </p>
      )}

      {/* Posts table */}
      {visible.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-ink-200 dark:border-ink-700">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500 dark:bg-ink-900 dark:text-ink-400">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Title</th>
                <th className="px-4 py-2.5 font-semibold">Category</th>
                <th className="px-4 py-2.5 font-semibold">Date</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-200 bg-white dark:divide-ink-800 dark:bg-ink-900/40">
              {visible.map((post) => (
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
                  <td className="px-4 py-3">
                    <PostRowActions id={post._id} title={post.title || "(untitled)"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---- public export wrapped in Suspense for SSR compatibility ----------------

interface AdminPostsListProps {
  posts: Post[];
}

export function AdminPostsList({ posts }: AdminPostsListProps): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <p className="py-4 text-sm text-ink-500 dark:text-ink-400">Loading filters...</p>
      }
    >
      <AdminPostsListInner posts={posts} />
    </Suspense>
  );
}
