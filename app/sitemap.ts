import type { MetadataRoute } from "next";
import { getPublishedPosts } from "@/lib/mudbase";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPublishedPosts();
  const base = "https://blog.mudbase.dev";

  const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${base}/posts/${post.slug}`,
    lastModified: post.updatedAt ?? post.publishedAt,
    changeFrequency: "monthly",
  }));

  const categories = Array.from(new Set(posts.map((post) => post.category.toLowerCase())));
  const categoryEntries: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${base}/category/${category}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    ...postEntries,
    ...categoryEntries,
  ];
}
