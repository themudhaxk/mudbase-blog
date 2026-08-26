import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/admin-auth";

/**
 * Keeps unauthenticated visitors out of the admin UI.
 *
 * This is a redirect for a nicer experience, not the authorization boundary — each
 * /api/admin route handler re-checks the session independently, so a middleware matcher
 * mistake cannot expose a write endpoint.
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();

  if (await verifySessionToken(request.cookies.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.next();
  }

  const login = request.nextUrl.clone();
  login.pathname = "/admin/login";
  login.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(login);
}

export const config = { matcher: ["/admin/:path*"] };
