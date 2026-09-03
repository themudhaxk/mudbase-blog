"use client";

import { useRef, useState } from "react";
import { embedHtmlFor } from "@/lib/markdown";

interface MarkdownToolbarProps {
  /** Replace the current selection (or insert at the caret) with `text`. */
  onInsert: (text: string) => void;
  onWrap: (before: string, after: string, placeholder: string) => void;
  onPrefixLines: (prefix: string) => void;
  disabled: boolean;
}

/** Colours the picker offers, drawn from the blog's own palette so posts stay on-brand. */
const SWATCHES = [
  { name: "Blue", value: "#3457d5" },
  { name: "Clay", value: "#d97757" },
  { name: "Green", value: "#2f9e6b" },
  { name: "Amber", value: "#c98a15" },
  { name: "Red", value: "#d13b3b" },
  { name: "Grey", value: "#6b7280" },
];

/**
 * A ready-made GFM table an author can drop in and edit, so a proper comparison
 * table takes no knowledge of the pipe-and-dash syntax. Blank lines around it keep
 * the table a standalone block wherever the caret sits.
 */
const TABLE_TEMPLATE = `
| Feature | Mudbase | Alternative |
| --- | --- | --- |
| Row one | Yes | No |
| Row two | Included | Add-on |
| Row three | Built in | Manual |
`;

const BTN =
  "rounded border border-ink-200 bg-white px-2 py-1 text-xs font-medium text-ink-700 transition hover:border-mud-400 hover:text-mud-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200 dark:hover:border-mud-500 dark:hover:text-mud-300";

export function MarkdownToolbar({
  onInsert,
  onWrap,
  onPrefixLines,
  disabled,
}: MarkdownToolbarProps): React.JSX.Element {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showColors, setShowColors] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleImageFile(file: File): Promise<void> {
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      const body = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !body.url) {
        setUploadError(body.error ?? "Upload failed.");
        return;
      }
      onInsert(`\n![${file.name.replace(/\.[^.]+$/, "")}](${body.url})\n`);
    } catch {
      setUploadError("Upload failed - check your connection and try again.");
    } finally {
      setUploading(false);
      // Clear the input so choosing the same file twice still fires a change event.
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handleLink(): void {
    const url = window.prompt("Link URL");
    if (!url?.trim()) return;
    onWrap("[", `](${url.trim()})`, "link text");
  }

  function handleImageUrl(): void {
    const url = window.prompt("Image URL");
    if (!url?.trim()) return;
    const alt = window.prompt("Alt text (describes the image for screen readers)") ?? "";
    onInsert(`\n![${alt}](${url.trim()})\n`);
  }

  function handleVideo(): void {
    const url = window.prompt("Video URL (YouTube, Vimeo or Loom)");
    if (!url?.trim()) return;
    const html = embedHtmlFor(url);
    if (!html) {
      window.alert("That link isn't a supported video URL. Use YouTube, Vimeo or Loom.");
      return;
    }
    onInsert(`\n${html}\n`);
  }

  function applyColor(hex: string): void {
    setShowColors(false);
    onWrap(`<span style="color:${hex}">`, "</span>", "coloured text");
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-t-lg border border-b-0 border-ink-200 bg-ink-50 p-2 dark:border-ink-700 dark:bg-ink-900/60">
      <button type="button" className={BTN} disabled={disabled} onClick={() => onWrap("**", "**", "bold text")}>
        <strong>B</strong>
      </button>
      <button type="button" className={BTN} disabled={disabled} onClick={() => onWrap("_", "_", "italic text")}>
        <em>I</em>
      </button>
      <button type="button" className={BTN} disabled={disabled} onClick={() => onWrap("`", "`", "code")}>
        {"</>"}
      </button>

      <span className="mx-1 h-4 w-px bg-ink-200 dark:bg-ink-700" aria-hidden />

      <button type="button" className={BTN} disabled={disabled} onClick={() => onPrefixLines("## ")}>
        H2
      </button>
      <button type="button" className={BTN} disabled={disabled} onClick={() => onPrefixLines("### ")}>
        H3
      </button>
      <button type="button" className={BTN} disabled={disabled} onClick={() => onPrefixLines("- ")}>
        List
      </button>
      <button type="button" className={BTN} disabled={disabled} onClick={() => onPrefixLines("1. ")}>
        1. List
      </button>
      <button type="button" className={BTN} disabled={disabled} onClick={() => onPrefixLines("> ")}>
        Quote
      </button>
      <button
        type="button"
        className={BTN}
        disabled={disabled}
        onClick={() => onInsert("\n```\ncode block\n```\n")}
      >
        Code block
      </button>
      <button type="button" className={BTN} disabled={disabled} onClick={() => onInsert(TABLE_TEMPLATE)}>
        Table
      </button>
      <button type="button" className={BTN} disabled={disabled} onClick={() => onInsert("\n---\n")}>
        Divider
      </button>

      <span className="mx-1 h-4 w-px bg-ink-200 dark:bg-ink-700" aria-hidden />

      <button type="button" className={BTN} disabled={disabled} onClick={handleLink}>
        Link
      </button>
      <button
        type="button"
        className={BTN}
        disabled={disabled || uploading}
        onClick={() => fileRef.current?.click()}
      >
        {uploading ? "Uploading…" : "Upload image"}
      </button>
      <button type="button" className={BTN} disabled={disabled} onClick={handleImageUrl}>
        Image URL
      </button>
      <button type="button" className={BTN} disabled={disabled} onClick={handleVideo}>
        Video
      </button>

      <div className="relative">
        <button
          type="button"
          className={BTN}
          disabled={disabled}
          aria-expanded={showColors}
          onClick={() => setShowColors((v) => !v)}
        >
          Colour
        </button>
        {showColors && (
          <div className="absolute left-0 top-full z-10 mt-1 flex gap-1 rounded border border-ink-200 bg-white p-2 shadow-lg dark:border-ink-700 dark:bg-ink-900">
            {SWATCHES.map((swatch) => (
              <button
                key={swatch.value}
                type="button"
                title={swatch.name}
                aria-label={swatch.name}
                onClick={() => applyColor(swatch.value)}
                className="h-6 w-6 rounded border border-ink-200 dark:border-ink-700"
                style={{ backgroundColor: swatch.value }}
              />
            ))}
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleImageFile(file);
        }}
      />

      {uploadError && (
        <span role="alert" className="ml-2 text-xs text-red-600 dark:text-red-400">
          {uploadError}
        </span>
      )}
    </div>
  );
}
