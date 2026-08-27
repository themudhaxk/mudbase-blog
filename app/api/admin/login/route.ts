import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  SESSION_COOKIE_OPTIONS,
  createSessionToken,
  passwordMatches,
} from "@/lib/admin-auth";
import {
  checkThrottle,
  clearFailures,
  clientIp,
  failureDelayMs,
  recordFailure,
} from "@/lib/login-throttle";

export const dynamic = "force-dynamic";

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * Rejects with a deliberately vague message: naming the reason would confirm valid passwords,
 * and distinguishing "wrong password" from "no password configured" tells an attacker whether
 * the surface is live.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const ip = clientIp(request.headers);

  const throttle = await checkThrottle(ip);
  if (throttle.blocked) {
    return NextResponse.json(
      { error: "Too many failed attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(throttle.retryAfterSeconds) } },
    );
  }

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
    const state = await recordFailure(ip);
    // Slows scripted guessing well before the lockout threshold is reached.
    await sleep(failureDelayMs(state.failures));
    if (state.blocked) {
      return NextResponse.json(
        { error: "Too many failed attempts. Try again later." },
        { status: 429, headers: { "Retry-After": String(state.retryAfterSeconds) } },
      );
    }
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  await clearFailures(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, await createSessionToken(), SESSION_COOKIE_OPTIONS);
  return res;
}
