import { AdminShell } from "@/components/admin/admin-shell";
import { PostEditor } from "@/components/admin/post-editor";
import { listAllPosts } from "@/lib/mudbase-admin";

export const dynamic = "force-dynamic";

export default async function NewPostPage(): Promise<React.JSX.Element> {
  return (
    <AdminShell>
      <PostEditor categories={await existingCategories()} />
    </AdminShell>
  );
}

/** Suggests categories already in use so the blog doesn't accumulate near-duplicate labels. */
async function existingCategories(): Promise<string[]> {
  try {
    const posts = await listAllPosts();
    return [...new Set(posts.map((p) => p.category).filter(Boolean))].sort();
  } catch {
    // A category list is a convenience; failing to load it must not block writing a post.
    return [];
  }
}
