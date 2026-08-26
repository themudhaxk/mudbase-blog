import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import { remarkPlugins, rehypePlugins, embedHtmlFor } from "../lib/markdown.ts";

/**
 * Guards the markdown pipeline's sanitising behaviour.
 *
 * Post bodies are rendered with raw HTML enabled so the admin editor's colour and video
 * controls work. That only stays safe while the sanitiser keeps holding, and the sanitiser's
 * behaviour depends on plugin order and a hand-written schema — both easy to break silently
 * during an unrelated edit. Run with `npm run verify:markdown`.
 */

function render(markdown: string): string {
  return renderToStaticMarkup(
    React.createElement(ReactMarkdown, { remarkPlugins, rehypePlugins }, markdown),
  );
}

interface Check {
  name: string;
  input: string;
  mustNotContain?: string[];
  mustContain?: string[];
}

const checks: Check[] = [
  {
    name: "strips <script>",
    input: "hello <script>alert(1)</script> world",
    mustNotContain: ["<script", "alert(1)"],
  },
  {
    name: "strips inline event handlers",
    input: `<img src=x onerror="alert(1)">`,
    mustNotContain: ["onerror", "alert(1)"],
  },
  {
    name: "drops iframes from non-allowlisted hosts",
    input: `<iframe src="https://evil.example/x"></iframe>`,
    mustNotContain: ["iframe", "evil.example"],
  },
  {
    name: "keeps allowlisted video embeds",
    input: embedHtmlFor("https://www.youtube.com/watch?v=dQw4w9WgXcQ") ?? "MISSING EMBED",
    mustContain: [`<iframe`, "youtube-nocookie.com/embed/dQw4w9WgXcQ"],
  },
  {
    name: "keeps a colour-only span style",
    input: `<span style="color:#3457d5">blue</span>`,
    mustContain: [`style="color:#3457d5"`],
  },
  {
    name: "drops a span style that is not just a colour",
    input: `<span style="position:fixed;top:0;left:0;width:100vw;height:100vh">x</span>`,
    mustNotContain: ["position:fixed", "style="],
  },
  {
    name: "strips javascript: links",
    input: "[click](javascript:alert(1))",
    mustNotContain: ["javascript:"],
  },
  {
    name: "still renders GFM tables",
    input: "| a | b |\n|---|---|\n| 1 | 2 |",
    mustContain: ["<table>", "<td>1</td>"],
  },
  {
    name: "still highlights code fences",
    input: "```js\nconst x = 1;\n```",
    mustContain: ["hljs", "language-js"],
  },
];

let failed = 0;

for (const check of checks) {
  const html = render(check.input);
  const problems: string[] = [];

  for (const needle of check.mustNotContain ?? []) {
    if (html.includes(needle)) problems.push(`should not contain ${JSON.stringify(needle)}`);
  }
  for (const needle of check.mustContain ?? []) {
    if (!html.includes(needle)) problems.push(`should contain ${JSON.stringify(needle)}`);
  }

  if (problems.length === 0) {
    console.log(`  ok  ${check.name}`);
    continue;
  }
  failed += 1;
  console.error(`FAIL  ${check.name}`);
  for (const problem of problems) console.error(`        ${problem}`);
  console.error(`        got: ${html}`);
}

// embedHtmlFor is the gate the editor itself uses; a permissive version here would let an
// arbitrary host reach the sanitiser in the first place.
for (const url of ["https://evil.example/embed/x", "https://evil.example/watch?v=a", "not a url", ""]) {
  if (embedHtmlFor(url) === null) {
    console.log(`  ok  rejects embed URL ${JSON.stringify(url)}`);
    continue;
  }
  failed += 1;
  console.error(`FAIL  embedHtmlFor accepted ${url}`);
}

// An http:// watch link is rewritten to the https embed rather than rejected — the host is
// what's being checked, and dropping the scheme downgrade would only cost authors a paste.
const upgraded = embedHtmlFor("http://www.youtube.com/watch?v=abc");
if (upgraded?.includes("https://www.youtube-nocookie.com/embed/abc")) {
  console.log("  ok  upgrades an http watch URL to an https embed");
} else {
  failed += 1;
  console.error(`FAIL  http watch URL was not upgraded: ${upgraded}`);
}

if (failed > 0) {
  console.error(`\n${failed} markdown safety check(s) failed.`);
  process.exit(1);
}
console.log("\nAll markdown safety checks passed.");
