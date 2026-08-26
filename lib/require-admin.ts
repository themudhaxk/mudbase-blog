import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/admin-auth";

/**
 * Guard for every admin route handler.
 *
 * middleware.ts already blocks unauthenticated /admin navigation, but middleware alone is not
 * an authorization boundary for the API: a matcher change, or a request that reaches the route
 * another way, would leave these endpoints open. Each handler re-checks.
 *
 * @returns a 401 response when unauthenticated, or null to proceed.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const jar = await cookies();
  if (await verifySessionToken(jar.get(ADMIN_COOKIE)?.value)) return null;
  return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
}
