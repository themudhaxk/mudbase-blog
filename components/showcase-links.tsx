import type { ShowcaseLinks } from "@/lib/showcases";

/**
 * Live demo + source buttons for a showcase post. Rendered above the body so the two things a
 * reader most wants ("can I try it?" / "can I read it?") are reachable without scrolling.
 */
export function ShowcaseLinksBar({ links }: { links: ShowcaseLinks }): React.JSX.Element {
  return (
    <div className="mb-10 flex flex-wrap items-center gap-3 rounded-xl border border-ink-200 bg-ink-50 p-4 dark:border-ink-700 dark:bg-ink-900">
      <a
        href={links.liveUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full bg-ink-950 px-4 py-2 text-sm font-medium text-ink-50 transition hover:bg-mud-600 dark:bg-ink-50 dark:text-ink-950 dark:hover:bg-mud-400"
      >
        <span aria-hidden="true">▶</span>
        Try the live demo
        <span className="sr-only">of the {links.label} (opens in a new tab)</span>
      </a>

      <a
        href={links.repoUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full border border-ink-300 px-4 py-2 text-sm font-medium text-ink-900 transition hover:border-mud-500 hover:text-mud-600 dark:border-ink-600 dark:text-ink-100 dark:hover:border-mud-400 dark:hover:text-mud-300"
      >
        <svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor" aria-hidden="true">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
        </svg>
        View source
        <span className="sr-only">on GitHub (opens in a new tab)</span>
      </a>

      <span className="ml-auto font-mono text-xs uppercase tracking-wide text-mud-600 dark:text-mud-300">
        Built on Mudbase
      </span>
    </div>
  );
}
