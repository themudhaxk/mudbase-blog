import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader(): React.JSX.Element {
  return (
    <header className="border-b border-ink-200 dark:border-ink-700">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-mud-500 font-mono text-[13px] font-bold text-ink-50">
            m
          </span>
          <span className="font-display text-lg font-medium tracking-tight text-ink-950 dark:text-ink-50">
            Mudbase <span className="hidden text-ink-400 sm:inline">/ blog</span>
          </span>
        </Link>
        <nav className="flex items-center gap-4 text-sm text-ink-600 dark:text-ink-200 sm:gap-5">
          <a
            href="https://www.mudbase.dev"
            className="transition hover:text-mud-600 dark:hover:text-mud-300"
          >
            Product
          </a>
          <a
            href="https://docs.mudbase.dev"
            className="transition hover:text-mud-600 dark:hover:text-mud-300"
          >
            Docs
          </a>
          <a
            href="https://console.mudbase.dev/console?signup"
            className="rounded-full bg-ink-950 px-3.5 py-1.5 text-[13px] font-medium text-ink-50 transition hover:bg-mud-600 dark:bg-ink-50 dark:text-ink-950 dark:hover:bg-mud-400"
          >
            Start building
          </a>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
