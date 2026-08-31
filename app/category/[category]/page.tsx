import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PostCard } from "@/components/post-card";
import { getPostsByCategory, getPublishedPosts } from "@/lib/mudbase";

export const revalidate = 300;

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

export async function generateStaticParams(): Promise<Array<{ category: string }>> {
  const posts = await getPublishedPosts();
  const categories = Array.from(new Set(posts.map((post) => post.category)));
  return categories.map((category) => ({ category: category.toLowerCase() }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category } = await params;
  const label = capitalize(category);
  const key = category.toLowerCase();

  return {
    title: `${label} posts`,
    description:
      key === "migration"
        ? "Migration guides and platform-move write-ups from the Mudbase blog."
        : key === "showcase"
          ? "Real showcase apps built on Mudbase, torn down and explained."
          : `All ${label} posts from the Mudbase blog.`,
    alternates: {
      canonical: `/category/${category}`,
    },
    openGraph: {
      title: `${label} posts - Mudbase Blog`,
      url: `/category/${category}`,
      siteName: "Mudbase Blog",
      type: "website",
    },
  };
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default async function CategoryPage({ params }: CategoryPageProps): Promise<React.JSX.Element> {
  const { category } = await params;
  const allPosts = await getPublishedPosts();
  const matchedCategory = allPosts.find(
    (post) => post.category.toLowerCase() === category.toLowerCase()
  )?.category;

  if (!matchedCategory) notFound();

  const posts = await getPostsByCategory(matchedCategory);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-14">
        <p className="mb-3 font-mono text-xs uppercase tracking-widest text-mud-600 dark:text-mud-300">
          Category
        </p>
        <h1 className="mb-10 font-display text-3xl font-medium text-ink-950 dark:text-ink-50 md:text-4xl">
          {matchedCategory}
        </h1>
        <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2">
          {posts.map((post) => (
            <PostCard key={post._id} post={post} />
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
