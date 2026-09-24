"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface PostRowActionsProps {
  id: string;
  title: string;
}

/**
 * Edit link and Delete button for a single row in the admin posts table.
 *
 * Rendered as a Client Component so the delete confirmation and fetch call work
 * in the browser without making the parent page client-only. The parent page
 * stays a Server Component that pre-fetches the post list.
 */
export function PostRowActions({ id, title }: PostRowActionsProps): React.JSX.Element {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(): Promise<void> {
    const confirmed = window.confirm(
      `Delete "${title}"? This cannot be undone.`,
    );
    if (!confirmed) return;

    setError(null);
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/posts/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? "Could not delete the post.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href={`/admin/edit/${id}`}
        className="text-sm font-medium text-mud-600 hover:underline dark:text-mud-300"
      >
        Edit
      </Link>
      <button
        type="button"
        disabled={deleting}
        onClick={() => void handleDelete()}
        className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
      >
        {deleting ? "Deleting..." : "Delete"}
      </button>
      {error && (
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
      )}
    </div>
  );
}
