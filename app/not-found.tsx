import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function NotFound(): React.JSX.Element {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <p className="font-mono text-sm text-mud-600 dark:text-mud-300">404</p>
        <h1 className="mt-3 font-display text-3xl font-medium text-ink-950 dark:text-ink-50">
          That post doesn&apos;t exist.
        </h1>
        <Link
          href="/"
          className="mt-6 rounded-full bg-ink-950 px-4 py-2 text-sm font-medium text-ink-50 transition hover:bg-mud-600 dark:bg-ink-50 dark:text-ink-950 dark:hover:bg-mud-400"
        >
          Back to the blog
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
