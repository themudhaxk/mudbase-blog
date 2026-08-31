"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { remarkPlugins, rehypePlugins } from "@/lib/markdown";
import { MarkdownToolbar } from "@/components/admin/markdown-toolbar";
import type { Post } from "@/lib/mudbase";

export interface PostDraft {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  coverImage: string;
  category: string;
  author: string;
  status: "draft" | "published";
  publishedAt: string;
}

interface PostEditorProps {
  /** Absent when composing a new post. */
  post?: Post;
  categories: string[];
}

const FIELD =
  "w-full rounded border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none transition focus:border-mud-500 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100";
const LABEL = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400";

/** URL-safe slug from a title: lowercase, words joined by hyphens, nothing else. */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function toDateInput(value: string | undefined): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? new Date().toISOString().slice(0, 10)
    : parsed.toISOString().slice(0, 10);
}

export function PostEditor({ post, categories }: PostEditorProps): React.JSX.Element {
  const router = useRouter();
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const [draft, setDraft] = useState<PostDraft>({
    title: post?.title ?? "",
    slug: post?.slug ?? "",
    excerpt: post?.excerpt ?? "",
    body: post?.body ?? "",
    coverImage: post?.coverImage ?? "",
    category: post?.category ?? categories[0] ?? "Engineering",
    author: post?.author ?? "Mudbase",
    status: post?.status === "published" ? "published" : "draft",
    publishedAt: toDateInput(post?.publishedAt),
  });
  const [slugTouched, setSlugTouched] = useState(Boolean(post?.slug));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  const set = useCallback(<K extends keyof PostDraft>(key: K, value: PostDraft[K]): void => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  function handleTitle(value: string): void {
    setDraft((prev) => ({
      ...prev,
      title: value,
      // Stop auto-deriving once the author edits the slug by hand, and never rewrite the slug
      // of a published post - changing it breaks every existing link to that post.
      slug: slugTouched || post?.status === "published" ? prev.slug : slugify(value),
    }));
  }

  /* -------------------------------------------------------------- */
  /* Textarea editing primitives, shared with the toolbar            */
  /* -------------------------------------------------------------- */

  const applyToBody = useCallback(
    (transform: (value: string, start: number, end: number) => { value: string; caret: [number, number] }): void => {
      const el = bodyRef.current;
      if (!el) return;
      const { value, caret } = transform(el.value, el.selectionStart, el.selectionEnd);
      set("body", value);
      // The state update re-renders before the caret can be placed, so defer to the next frame.
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(caret[0], caret[1]);
      });
    },
    [set],
  );

  const insert = useCallback(
    (text: string): void => {
      applyToBody((value, start, end) => ({
        value: value.slice(0, start) + text + value.slice(end),
        caret: [start + text.length, start + text.length],
      }));
    },
    [applyToBody],
  );

  const wrap = useCallback(
    (before: string, after: string, placeholder: string): void => {
      applyToBody((value, start, end) => {
        const selected = value.slice(start, end) || placeholder;
        const next = value.slice(0, start) + before + selected + after + value.slice(end);
        // Select the wrapped text so typing immediately replaces the placeholder.
        return { value: next, caret: [start + before.length, start + before.length + selected.length] };
      });
    },
    [applyToBody],
  );

  const prefixLines = useCallback(
    (prefix: string): void => {
      applyToBody((value, start, end) => {
        const lineStart = value.lastIndexOf("\n", start - 1) + 1;
        const lineEnd = value.indexOf("\n", end) === -1 ? value.length : value.indexOf("\n", end);
        const block = value.slice(lineStart, lineEnd) || "text";
        const prefixed = block
          .split("\n")
          .map((line) => (line.startsWith(prefix) ? line : prefix + line))
          .join("\n");
        const next = value.slice(0, lineStart) + prefixed + value.slice(lineEnd);
        return { value: next, caret: [lineStart, lineStart + prefixed.length] };
      });
    },
    [applyToBody],
  );

  /* -------------------------------------------------------------- */
  /* Persistence                                                     */
  /* -------------------------------------------------------------- */

  async function save(status: "draft" | "published"): Promise<void> {
    setError(null);

    if (!draft.title.trim()) return setError("Give the post a title before saving.");
    if (!draft.slug.trim()) return setError("The post needs a slug - it becomes the URL.");
    if (status === "published" && !draft.excerpt.trim()) {
      return setError("Published posts need an excerpt; it's the summary shown on the index and in link previews.");
    }

    setSaving(true);
    try {
      const payload = {
        ...draft,
        status,
        title: draft.title.trim(),
        slug: draft.slug.trim(),
        excerpt: draft.excerpt.trim(),
        // Stored as a full ISO timestamp because the reader sorts and formats on it.
        publishedAt: new Date(`${draft.publishedAt}T09:00:00.000Z`).toISOString(),
      };

      const res = await fetch(post ? `/api/admin/posts/${post._id}` : "/api/admin/posts", {
        method: post ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json()) as { error?: string; code?: string; field?: string; post?: Post };
      if (!res.ok) {
        // The API reports a unique-field clash as 409 duplicate_key. Say which field, and
        // point at the slug specifically, since that's the one an author actually chooses.
        if (res.status === 409 && body.field === "slug") {
          setError(`The slug "${draft.slug.trim()}" is already used by another post. Pick a different one.`);
          return;
        }
        setError(body.error ?? "Could not save the post.");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Could not reach the server. Your text is still here - try saving again.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(): Promise<void> {
    if (!post) return;
    if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/posts/${post._id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? "Could not delete the post.");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setDeleting(false);
    }
  }

  const busy = saving || deleting;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink-950 dark:text-ink-50">
            {post ? "Edit post" : "New post"}
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            {post?.status === "published" ? (
              <>
                Live at{" "}
                <Link href={`/posts/${post.slug}`} className="text-mud-600 underline dark:text-mud-300">
                  /posts/{post.slug}
                </Link>
              </>
            ) : (
              "Drafts stay invisible on the public blog until you publish."
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="rounded border border-ink-200 px-3 py-2 text-sm text-ink-700 hover:border-ink-400 dark:border-ink-700 dark:text-ink-200"
          >
            Cancel
          </Link>
          <button
            type="button"
            disabled={busy}
            onClick={() => void save("draft")}
            className="rounded border border-ink-300 px-3 py-2 text-sm font-medium text-ink-800 hover:border-ink-500 disabled:opacity-50 dark:border-ink-600 dark:text-ink-100"
          >
            {saving ? "Saving…" : "Save draft"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void save("published")}
            className="rounded bg-mud-600 px-4 py-2 text-sm font-semibold text-white hover:bg-mud-500 disabled:opacity-50"
          >
            {post?.status === "published" ? "Update" : "Publish"}
          </button>
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

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className={LABEL} htmlFor="post-title">
            Title
          </label>
          <input
            id="post-title"
            className={FIELD}
            value={draft.title}
            onChange={(e) => handleTitle(e.target.value)}
            placeholder="How we cut cold starts by 60%"
          />
        </div>

        <div>
          <label className={LABEL} htmlFor="post-slug">
            Slug
          </label>
          <input
            id="post-slug"
            className={`${FIELD} font-mono`}
            value={draft.slug}
            onChange={(e) => {
              setSlugTouched(true);
              set("slug", e.target.value);
            }}
            placeholder="how-we-cut-cold-starts"
          />
          {post?.status === "published" && (
            <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
              Changing this breaks existing links to the post.
            </p>
          )}
        </div>

        <div>
          <label className={LABEL} htmlFor="post-category">
            Category
          </label>
          <input
            id="post-category"
            className={FIELD}
            list="post-categories"
            value={draft.category}
            onChange={(e) => set("category", e.target.value)}
          />
          <datalist id="post-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <div>
          <label className={LABEL} htmlFor="post-author">
            Author
          </label>
          <input
            id="post-author"
            className={FIELD}
            value={draft.author}
            onChange={(e) => set("author", e.target.value)}
          />
        </div>

        <div>
          <label className={LABEL} htmlFor="post-date">
            Publish date
          </label>
          <input
            id="post-date"
            type="date"
            className={FIELD}
            value={draft.publishedAt}
            onChange={(e) => set("publishedAt", e.target.value)}
          />
        </div>

        <div className="md:col-span-2">
          <label className={LABEL} htmlFor="post-excerpt">
            Excerpt
          </label>
          <textarea
            id="post-excerpt"
            className={`${FIELD} min-h-[70px] resize-y`}
            value={draft.excerpt}
            onChange={(e) => set("excerpt", e.target.value)}
            placeholder="One or two sentences. Shown on the index and in link previews."
          />
        </div>

        <div className="md:col-span-2">
          <label className={LABEL} htmlFor="post-cover">
            Cover image URL
          </label>
          <div className="flex gap-2">
            <input
              id="post-cover"
              className={`${FIELD} font-mono text-xs`}
              value={draft.coverImage}
              onChange={(e) => set("coverImage", e.target.value)}
              placeholder="https://api.mudbase.dev/api/files/public/…"
            />
            <CoverUploadButton onUploaded={(url) => set("coverImage", url)} />
          </div>
          {draft.coverImage && (
            // Deliberately a plain <img>: next/image needs the host in next.config remotePatterns,
            // and a cover URL can point anywhere the author pastes.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={draft.coverImage}
              alt=""
              className="mt-2 h-32 w-full rounded border border-ink-200 object-cover dark:border-ink-700"
            />
          )}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className={LABEL}>Body</span>
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="text-xs font-medium text-mud-600 hover:underline dark:text-mud-300"
          >
            {showPreview ? "Hide preview" : "Show preview"}
          </button>
        </div>

        <MarkdownToolbar onInsert={insert} onWrap={wrap} onPrefixLines={prefixLines} disabled={busy} />

        <div className={showPreview ? "grid gap-4 lg:grid-cols-2" : ""}>
          <textarea
            ref={bodyRef}
            value={draft.body}
            onChange={(e) => set("body", e.target.value)}
            spellCheck
            className="min-h-[540px] w-full rounded-b-lg border border-ink-200 bg-white p-4 font-mono text-sm leading-relaxed text-ink-900 outline-none focus:border-mud-500 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100"
            placeholder="Write in Markdown. Use the toolbar above for formatting, images and video."
          />

          {showPreview && (
            <div className="min-h-[540px] overflow-y-auto rounded-b-lg border border-ink-200 bg-white p-6 dark:border-ink-700 dark:bg-ink-900">
              <div className="prose-mud">
                {draft.body.trim() ? (
                  <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins}>
                    {draft.body}
                  </ReactMarkdown>
                ) : (
                  <p className="text-sm italic text-ink-400">
                    The preview renders with the same pipeline as the published page, so what you
                    see here is what readers get.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {post && (
        <div className="border-t border-ink-200 pt-4 dark:border-ink-700">
          <button
            type="button"
            disabled={busy}
            onClick={() => void remove()}
            className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
          >
            {deleting ? "Deleting…" : "Delete this post"}
          </button>
        </div>
      )}
    </div>
  );
}

function CoverUploadButton({ onUploaded }: { onUploaded: (url: string) => void }): React.JSX.Element {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File): Promise<void> {
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      const body = (await res.json()) as { url?: string; error?: string };
      if (res.ok && body.url) onUploaded(body.url);
      else window.alert(body.error ?? "Upload failed.");
    } catch {
      window.alert("Upload failed - check your connection and try again.");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={() => ref.current?.click()}
        className="shrink-0 rounded border border-ink-200 px-3 py-2 text-sm text-ink-700 hover:border-mud-400 disabled:opacity-50 dark:border-ink-700 dark:text-ink-200"
      >
        {busy ? "Uploading…" : "Upload"}
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />
    </>
  );
}
