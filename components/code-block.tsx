"use client";

import { Children, isValidElement, useRef, useState } from "react";
import type { ComponentPropsWithoutRef } from "react";

/** Extract the first `language-*` class from the direct <code> child. */
function extractLanguage(children: React.ReactNode): string {
  for (const child of Children.toArray(children)) {
    if (!isValidElement(child)) continue;
    const props = child.props as Record<string, unknown>;
    if (typeof props.className === "string") {
      const m = /\blanguage-([\w-]+)/.exec(props.className);
      if (m) return m[1];
    }
  }
  return "";
}

/** Capitalise common language identifiers for the label badge. */
const DISPLAY_NAMES: Record<string, string> = {
  js: "JavaScript",
  javascript: "JavaScript",
  ts: "TypeScript",
  typescript: "TypeScript",
  jsx: "JSX",
  tsx: "TSX",
  py: "Python",
  python: "Python",
  go: "Go",
  rs: "Rust",
  rust: "Rust",
  sh: "Shell",
  bash: "Bash",
  shell: "Shell",
  zsh: "Zsh",
  json: "JSON",
  yaml: "YAML",
  yml: "YAML",
  toml: "TOML",
  html: "HTML",
  css: "CSS",
  scss: "SCSS",
  sql: "SQL",
  php: "PHP",
  ruby: "Ruby",
  rb: "Ruby",
  java: "Java",
  kotlin: "Kotlin",
  swift: "Swift",
  cs: "C#",
  csharp: "C#",
  cpp: "C++",
  c: "C",
  dockerfile: "Dockerfile",
  docker: "Dockerfile",
  xml: "XML",
  graphql: "GraphQL",
  gql: "GraphQL",
  markdown: "Markdown",
  md: "Markdown",
  diff: "Diff",
  nginx: "Nginx",
  plaintext: "Plain text",
  text: "Plain text",
  curl: "cURL",
};

function displayName(lang: string): string {
  return DISPLAY_NAMES[lang.toLowerCase()] ?? lang;
}

/** Inline SVG icon: two overlapping rectangles (copy). */
function CopyIcon(): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

/** Inline SVG icon: checkmark. */
function CheckIcon(): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/**
 * Drop-in `pre` override for react-markdown.
 *
 * Wraps every fenced code block with a header row that shows a language badge
 * and a one-click copy button. The actual `<pre>` element retains its prose-mud
 * styling; this component adds no new visual opinions beyond the header.
 */
export function CodeBlock({ children, ...rest }: ComponentPropsWithoutRef<"pre">): React.JSX.Element {
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);
  const lang = extractLanguage(children);
  const label = lang ? displayName(lang) : "";

  function copy(): void {
    const text = preRef.current?.textContent ?? "";
    void navigator.clipboard.writeText(text.replace(/\n$/, "")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div className="code-block-wrap">
      <div className="code-block-header">
        <span className="code-block-lang">{label}</span>
        <button
          type="button"
          className="code-block-copy"
          onClick={copy}
          aria-label={copied ? "Copied!" : "Copy code"}
          title={copied ? "Copied!" : "Copy code"}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
          <span className="code-copy-text">{copied ? "Copied!" : "Copy"}</span>
        </button>
      </div>
      {/* The spread preserves any className react-markdown or rehype-highlight
          attaches, plus other HTML attributes. */}
      <pre ref={preRef} {...rest}>
        {children}
      </pre>
    </div>
  );
}
