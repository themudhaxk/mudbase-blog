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

  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    ...postEntries,
  ];
}
