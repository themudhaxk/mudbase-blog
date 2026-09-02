import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import { getCategories } from "@/lib/mudbase";

export async function SiteHeader(): Promise<React.JSX.Element> {
  // Derived from the live posts (a cached, revalidated fetch shared with the page), so the nav only
  // ever lists categories the content actually carries.
  const categories = await getCategories();

  return (
    <header className="border-b border-ink-200 dark:border-ink-700">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 pb-4 pt-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo.svg"
            alt="Mudbase"
            width={35}
            height={24}
            priority
            className="h-6 w-auto"
          />
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
      {categories.length > 0 && (
        <nav
          aria-label="Post categories"
          className="mx-auto max-w-3xl overflow-x-auto px-6 pb-3"
        >
          <ul className="flex items-center gap-5 whitespace-nowrap font-mono text-xs uppercase tracking-widest text-ink-500 dark:text-ink-400">
            <li>
              <Link
                href="/"
                className="transition hover:text-mud-600 dark:hover:text-mud-300"
              >
                All
              </Link>
            </li>
            {categories.map((category) => (
              <li key={category}>
                <Link
                  href={`/category/${category.toLowerCase()}`}
                  className="transition hover:text-mud-600 dark:hover:text-mud-300"
                >
                  {category}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
