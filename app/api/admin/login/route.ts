import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  SESSION_COOKIE_OPTIONS,
  createSessionToken,
  passwordMatches,
} from "@/lib/admin-auth";

/** Rejects with a deliberately vague message: a precise one would confirm valid passwords. */
export async function POST(request: Request): Promise<NextResponse> {
  let password = "";
  try {
    const body = (await request.json()) as { password?: string };
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!process.env.BLOG_ADMIN_PASSWORD || !process.env.BLOG_ADMIN_SECRET) {
    return NextResponse.json(
      { error: "Admin is not configured on this deployment." },
      { status: 503 },
    );
  }

  if (!(await passwordMatches(password))) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, await createSessionToken(), SESSION_COOKIE_OPTIONS);
  return res;
}
