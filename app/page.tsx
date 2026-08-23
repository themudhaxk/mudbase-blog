import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PostCard } from "@/components/post-card";
import { getPublishedPosts } from "@/lib/mudbase";

export const revalidate = 300;

export default async function HomePage(): Promise<React.JSX.Element> {
  const posts = await getPublishedPosts();
  const [featured, ...rest] = posts;

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
            Mudbase — written the way we&apos;d want to read them, bugs and all.
          </p>
        </div>

        {posts.length === 0 ? (
          <p className="text-ink-500">No posts published yet — check back soon.</p>
        ) : (
          <div className="flex flex-col gap-16">
            {featured && <PostCard post={featured} featured />}
            {rest.length > 0 && (
              <div className="grid grid-cols-1 gap-x-8 gap-y-12 border-t border-ink-200 pt-12 dark:border-ink-700 sm:grid-cols-2">
                {rest.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
