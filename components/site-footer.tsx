export function SiteFooter(): React.JSX.Element {
  return (
    <footer className="border-t border-ink-200 dark:border-ink-700">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 px-6 py-10 text-center text-sm text-ink-400">
        <p>
          Written straight from the platform - every post here is a document in a public
          Mudbase collection, fetched with the same API you&apos;d use.
        </p>
        <div className="flex items-center gap-4">
          <a href="https://www.mudbase.dev" className="transition hover:text-mud-600 dark:hover:text-mud-300">
            mudbase.dev
          </a>
          <a href="https://docs.mudbase.dev" className="transition hover:text-mud-600 dark:hover:text-mud-300">
            docs
          </a>
          <a
            href="https://www.linkedin.com/company/mudbase-dev"
            className="transition hover:text-mud-600 dark:hover:text-mud-300"
          >
            LinkedIn
          </a>
          <a href="https://x.com/mudbasedev" className="transition hover:text-mud-600 dark:hover:text-mud-300">
            X
          </a>
        </div>
        <p>© {new Date().getUTCFullYear()} Mudbase</p>
      </div>
    </footer>
  );
}
