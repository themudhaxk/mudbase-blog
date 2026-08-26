import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { AdminApiError, uploadImage } from "@/lib/mudbase-admin";

export const dynamic = "force-dynamic";

/** Largest image accepted. Bounded here so a huge upload is refused before it reaches storage. */
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request): Promise<NextResponse> {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image exceeds the 10MB limit" }, { status: 413 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are supported" }, { status: 400 });
    }
    return NextResponse.json({ url: await uploadImage(file) });
  } catch (e) {
    const err = e as AdminApiError;
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 });
  }
}
