"use client";

import { useMemo, useState } from "react";
import { PostCard } from "@/components/post-card";
import type { Post } from "@/lib/mudbase";

/**
 * Client-side search over the already-fetched posts.
 *
 * The whole published set arrives with the page (it is a small, revalidated list), so filtering
 * happens in the browser: no extra request, no loading state, and results update as you type.
 * If the archive ever grows past a few hundred posts this should move server-side, but paying
 * for a round trip per keystroke today would be slower, not faster.
 */
export function PostSearch({ posts }: { posts: Post[] }): React.JSX.Element {
  const [query, setQuery] = useState("");
  const trimmed = query.trim().toLowerCase();

  const matches = useMemo(() => {
    if (!trimmed) return posts;
    // Title, excerpt and category - not the full body. Matching body text surfaces posts whose
    // relevance the reader can't see from the card, which reads as a broken search.
    return posts.filter((p) =>
      [p.title, p.excerpt, p.category].some((f) => (f ?? "").toLowerCase().includes(trimmed)),
    );
  }, [posts, trimmed]);

  const [featured, ...rest] = matches;

  return (
    <>
      <div className="mb-12">
        <label htmlFor="post-search" className="sr-only">
          Search posts
        </label>
        <div className="relative">
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400 dark:text-ink-500"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            id="post-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search posts…"
            className="w-full rounded-full border border-ink-200 bg-white py-3 pl-11 pr-4 text-[15px] text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-mud-500 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100 dark:placeholder:text-ink-500 dark:focus:border-mud-400"
          />
        </div>
        {trimmed && (
          // aria-live so a screen reader hears the count change; the visible text alone would
          // update silently.
          <p
            aria-live="polite"
            className="mt-3 font-mono text-xs uppercase tracking-widest text-mud-600 dark:text-mud-300"
          >
            {matches.length} {matches.length === 1 ? "post" : "posts"} matching “{query.trim()}”
          </p>
        )}
      </div>

      {matches.length === 0 ? (
        <p className="text-ink-500 dark:text-ink-400">
          No posts match “{query.trim()}”. Try a different term.
        </p>
      ) : (
        <div className="flex flex-col gap-16">
          {/* Only lead with the large featured treatment on the unfiltered view - inside a
              result set it implies a ranking that isn't there. */}
          {featured && !trimmed && <PostCard post={featured} featured />}
          {trimmed ? (
            <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2">
              {matches.map((post) => (
                <PostCard key={post._id} post={post} />
              ))}
            </div>
          ) : (
            rest.length > 0 && (
              <div className="grid grid-cols-1 gap-x-8 gap-y-12 border-t border-ink-200 pt-12 dark:border-ink-700 sm:grid-cols-2">
                {rest.map((post) => (
                  <PostCard key={post._id} post={post} />
                ))}
              </div>
            )
          )}
        </div>
      )}
    </>
  );
}
