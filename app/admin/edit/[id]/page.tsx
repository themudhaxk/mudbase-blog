import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { PostEditor } from "@/components/admin/post-editor";
import { listAllPosts } from "@/lib/mudbase-admin";

export const dynamic = "force-dynamic";

interface EditPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPostPage({ params }: EditPageProps): Promise<React.JSX.Element> {
  const { id } = await params;
  const posts = await listAllPosts();
  const post = posts.find((p) => p._id === id);
  if (!post) notFound();

  const categories = [...new Set(posts.map((p) => p.category).filter(Boolean))].sort();

  return (
    <AdminShell>
      <PostEditor post={post} categories={categories} />
    </AdminShell>
  );
}
