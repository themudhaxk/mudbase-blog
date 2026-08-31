import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PostSearch } from "@/components/post-search";
import { getPublishedPosts } from "@/lib/mudbase";

export const revalidate = 300;

export default async function HomePage(): Promise<React.JSX.Element> {
  const posts = await getPublishedPosts();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-14">
        <div className="mb-14">
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-mud-600 dark:text-mud-300">
            From the team
          </p>
          <h1 className="font-display text-4xl font-medium leading-tight text-ink-950 dark:text-ink-50 md:text-5xl">
            Notes on building without a second backend.
          </h1>
          <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-ink-600 dark:text-ink-300">
            Migration guides, real showcase apps, and the engineering decisions behind
            Mudbase - written the way we&apos;d want to read them, bugs and all.
          </p>
        </div>

        {posts.length === 0 ? (
          <p className="text-ink-500">No posts published yet - check back soon.</p>
        ) : (
          /* Posts are still fetched and rendered on the server; PostSearch is a thin client
             wrapper that filters the same list, so the page keeps its SSR'd content and search
             costs no extra request. */
          <PostSearch posts={posts} />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
