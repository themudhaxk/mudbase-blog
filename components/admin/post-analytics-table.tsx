"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkline } from "./sparkline";

export interface PostAnalyticsRow {
  postId: string;
  title: string;
  slug: string;
  status: string;
  totalViews: number;
  last7Days: number;
  trend30d: { date: string; count: number }[];
  trendFrom: string;
  trendTo: string;
}

type SortKey = "totalViews" | "last7Days" | "title";
type SortDir = "desc" | "asc";

interface PostAnalyticsTableProps {
  rows: PostAnalyticsRow[];
}

function SortIcon({ dir }: { dir: SortDir | null }): React.JSX.Element {
  if (dir === null) {
    return (
      <span className="ml-1 text-ink-300 dark:text-ink-600" aria-hidden="true">
        &#8597;
      </span>
    );
  }
  return (
    <span className="ml-1 text-mud-600 dark:text-mud-400" aria-hidden="true">
      {dir === "asc" ? "↑" : "↓"}
    </span>
  );
}

export function PostAnalyticsTable({ rows }: PostAnalyticsTableProps): React.JSX.Element {
  const [sortKey, setSortKey] = useState<SortKey>("totalViews");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function toggleSort(key: SortKey): void {
    if (sortKey === key) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sorted = [...rows].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "totalViews") cmp = a.totalViews - b.totalViews;
    else if (sortKey === "last7Days") cmp = a.last7Days - b.last7Days;
    else cmp = a.title.localeCompare(b.title);
    return sortDir === "desc" ? -cmp : cmp;
  });

  function thClass(key: SortKey): string {
    return [
      "px-4 py-2.5 text-left font-semibold cursor-pointer select-none whitespace-nowrap",
      "hover:text-ink-900 dark:hover:text-ink-100 transition-colors",
      sortKey === key ? "text-ink-900 dark:text-ink-100" : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-ink-300 px-4 py-12 text-center dark:border-ink-700">
        <p className="text-sm text-ink-500 dark:text-ink-400">
          No posts to show yet.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-ink-200 dark:border-ink-700">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500 dark:bg-ink-900 dark:text-ink-400">
          <tr>
            <th
              className={thClass("title")}
              onClick={() => toggleSort("title")}
              aria-sort={
                sortKey === "title"
                  ? sortDir === "asc"
                    ? "ascending"
                    : "descending"
                  : "none"
              }
            >
              Post
              <SortIcon dir={sortKey === "title" ? sortDir : null} />
            </th>
            <th
              className={thClass("totalViews")}
              onClick={() => toggleSort("totalViews")}
              aria-sort={
                sortKey === "totalViews"
                  ? sortDir === "asc"
                    ? "ascending"
                    : "descending"
                  : "none"
              }
            >
              All-time views
              <SortIcon dir={sortKey === "totalViews" ? sortDir : null} />
            </th>
            <th
              className={thClass("last7Days")}
              onClick={() => toggleSort("last7Days")}
              aria-sort={
                sortKey === "last7Days"
                  ? sortDir === "asc"
                    ? "ascending"
                    : "descending"
                  : "none"
              }
            >
              Last 7 days
              <SortIcon dir={sortKey === "last7Days" ? sortDir : null} />
            </th>
            <th className="px-4 py-2.5 font-semibold">30-day trend</th>
            <th className="px-4 py-2.5 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-200 bg-white dark:divide-ink-800 dark:bg-ink-900/40">
          {sorted.map((row) => (
            <tr key={row.postId} className="hover:bg-ink-50 dark:hover:bg-ink-900/70">
              <td className="px-4 py-3 max-w-xs">
                <div className="font-medium text-ink-900 dark:text-ink-100 truncate">
                  {row.title || "(untitled)"}
                </div>
                <div className="mt-0.5 font-mono text-xs text-ink-400 flex items-center gap-2">
                  <span className="truncate">/{row.slug}</span>
                  {row.status === "published" && (
                    <Link
                      href={`/posts/${row.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-mud-600 hover:text-mud-500 dark:text-mud-400 dark:hover:text-mud-300"
                      aria-label={`View post: ${row.title}`}
                    >
                      View
                    </Link>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="tabular-nums text-ink-900 dark:text-ink-100 font-semibold">
                  {row.totalViews.toLocaleString()}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="tabular-nums text-ink-700 dark:text-ink-300">
                  {row.last7Days.toLocaleString()}
                </span>
              </td>
              <td className="px-4 py-3">
                <Sparkline
                  trend={row.trend30d}
                  from={row.trendFrom}
                  to={row.trendTo}
                  className="block"
                />
              </td>
              <td className="px-4 py-3">
                <StatusPill status={row.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
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
