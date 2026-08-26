import { NextResponse } from "next/server";
import { ADMIN_COOKIE, SESSION_COOKIE_OPTIONS } from "@/lib/admin-auth";

export async function POST(): Promise<NextResponse> {
  const res = NextResponse.json({ ok: true });
  // maxAge 0 expires it immediately; the rest of the options must match or some browsers
  // keep the original cookie alongside the expired one.
  res.cookies.set(ADMIN_COOKIE, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
  return res;
}
