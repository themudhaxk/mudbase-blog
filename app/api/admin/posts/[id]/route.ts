import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { AdminApiError, deletePost, getPostById, updatePost, type PostInput } from "@/lib/mudbase-admin";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { id } = await params;
    const input = (await request.json()) as Partial<PostInput>;

    // Pre-fetch so we can invalidate the old slug and category when they change.
    // If this fails, proceed without old-path invalidation rather than blocking the write.
    let before: Awaited<ReturnType<typeof getPostById>> = null;
    try {
      before = await getPostById(id);
    } catch (err) {
      console.error('[admin] pre-fetch before PATCH failed (old-path invalidation skipped):', err);
    }

    const post = await updatePost(id, input);

    try {
      revalidateTag('posts', { expire: 0 });
      revalidatePath("/");

      const newSlug = input.slug ?? before?.slug;
      const oldSlug = before?.slug;
      const newCategory = input.category ?? before?.category;
      const oldCategory = before?.category;

      // Invalidate old slug if it is changing.
      if (oldSlug && oldSlug !== newSlug) {
        revalidatePath(`/posts/${oldSlug}`);
      }
      if (newSlug) revalidatePath(`/posts/${newSlug}`);

      // Invalidate old category if it is changing.
      if (oldCategory && oldCategory.toLowerCase() !== newCategory?.toLowerCase()) {
        revalidatePath(`/category/${oldCategory.toLowerCase()}`);
      }
      if (newCategory) revalidatePath(`/category/${newCategory.toLowerCase()}`);
    } catch (err) {
      console.error('[admin] revalidation error after PATCH:', err);
    }

    return NextResponse.json({ post });
  } catch (e) {
    const err = e as AdminApiError;
    return NextResponse.json(
      { ...(err.detail ?? {}), error: err.message },
      { status: err.status ?? 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { id } = await params;

    // Pre-fetch so we can invalidate the post's own paths after deletion.
    let before: Awaited<ReturnType<typeof getPostById>> = null;
    try {
      before = await getPostById(id);
    } catch (err) {
      console.error('[admin] pre-fetch before DELETE failed (post-path invalidation skipped):', err);
    }

    await deletePost(id);

    try {
      revalidateTag('posts', { expire: 0 });
      revalidatePath("/");
      if (before?.slug) revalidatePath(`/posts/${before.slug}`);
      if (before?.category) revalidatePath(`/category/${before.category.toLowerCase()}`);
    } catch (err) {
      console.error('[admin] revalidation error after DELETE:', err);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const err = e as AdminApiError;
    return NextResponse.json(
      { ...(err.detail ?? {}), error: err.message },
      { status: err.status ?? 500 },
    );
  }
}
