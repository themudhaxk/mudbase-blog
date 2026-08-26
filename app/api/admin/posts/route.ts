import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { AdminApiError, createPost, listAllPosts, type PostInput } from "@/lib/mudbase-admin";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    return NextResponse.json({ posts: await listAllPosts() });
  } catch (e) {
    const err = e as AdminApiError;
    return NextResponse.json(
      { ...(err.detail ?? {}), error: err.message },
      { status: err.status ?? 500 },
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const input = (await request.json()) as PostInput;
    if (!input?.title?.trim() || !input?.slug?.trim()) {
      return NextResponse.json({ error: "Title and slug are required" }, { status: 400 });
    }
    return NextResponse.json({ post: await createPost(input) }, { status: 201 });
  } catch (e) {
    const err = e as AdminApiError;
    return NextResponse.json(
      { ...(err.detail ?? {}), error: err.message },
      { status: err.status ?? 500 },
    );
  }
}
