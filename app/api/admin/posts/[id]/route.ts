import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { AdminApiError, deletePost, updatePost, type PostInput } from "@/lib/mudbase-admin";

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
    return NextResponse.json({ post: await updatePost(id, input) });
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
    await deletePost(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const err = e as AdminApiError;
    return NextResponse.json(
      { ...(err.detail ?? {}), error: err.message },
      { status: err.status ?? 500 },
    );
  }
}
