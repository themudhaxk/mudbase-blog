/**
 * Brute-force throttling for the admin login.
 *
 * The whole admin is gated by one shared password, so that password is the entire attack
 * surface — and without throttling an attacker gets unlimited, free guesses at it.
 *
 * This counts in Redis, via a small internal endpoint on the Mudbase API, rather than in
 * process memory. An in-memory counter was tried first and measurably does not work here:
 * Vercel spreads requests across many short-lived instances, so the count never accumulates —
 * 30 concurrent wrong passwords against the deployed version produced 30 × 401 and no
 * throttling at all. A shared store is the only thing that actually counts.
 *
 * It still keys on IP, which is neither stable nor unique per person. That is acceptable here
 * in a way it is not for signup gating: the failure mode is a 15-minute wait on one internal
 * surface with a known operator, not a stranger being refused an account.
 *
 * Every failure path fails OPEN. A throttle that is down must not become a lockout on the
 * surface it protects.
 */

const API_BASE = process.env.MUDBASE_API_BASE ?? "https://api.mudbase.dev";

/** Failures allowed from one address before it is refused for the rest of the window. */
const MAX_FAILURES = 8;
const WINDOW_SECONDS = 15 * 60;
const SCOPE = "blog-admin-login";

/** Bounded so a slow throttle can never hold up a sign-in. */
const TIMEOUT_MS = 2500;

export interface ThrottleState {
  blocked: boolean;
  retryAfterSeconds: number;
  failures: number;
  /** True when the throttle could not be consulted and the request was allowed through. */
  degraded: boolean;
}

const OPEN: ThrottleState = { blocked: false, retryAfterSeconds: 0, failures: 0, degraded: true };

/**
 * The client address as Vercel determined it.
 *
 * `x-vercel-forwarded-for` is set by Vercel's edge. `x-forwarded-for` is not safe to read
 * leftmost — a client can send it themselves, which would let an attacker mint a fresh
 * counter per request, the same way a proxy-supplied address once collapsed every Mudbase
 * user onto one rate-limit key.
 */
export function clientIp(headers: Headers): string {
  const vercel = headers.get("x-vercel-forwarded-for");
  if (vercel) return vercel.split(",")[0].trim();
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

async function call(body: Record<string, unknown>): Promise<ThrottleState> {
  const secret = process.env.MUDBASE_INTERNAL_API_KEY;
  if (!secret) return OPEN;

  try {
    // Mounted at /internal, not /api/internal (see server.js) — verified against the running
    // service rather than assumed.
    const res = await fetch(`${API_BASE}/internal/throttle/consume`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-api-key": secret },
      body: JSON.stringify({ scope: SCOPE, windowSeconds: WINDOW_SECONDS, limit: MAX_FAILURES, ...body }),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return OPEN;

    const json = (await res.json()) as {
      allowed?: boolean;
      count?: number;
      retryAfterSeconds?: number;
      degraded?: boolean;
    };
    return {
      blocked: json.allowed === false,
      retryAfterSeconds: json.retryAfterSeconds ?? WINDOW_SECONDS,
      failures: json.count ?? 0,
      degraded: json.degraded === true,
    };
  } catch {
    return OPEN;
  }
}

/** Current state for an address without recording an attempt. */
export function checkThrottle(ip: string): Promise<ThrottleState> {
  return call({ identifier: ip, peek: true });
}

/** Record a failed attempt and return the updated state. */
export function recordFailure(ip: string): Promise<ThrottleState> {
  return call({ identifier: ip });
}

/** Clear an address's failures. Called on a successful sign-in. */
export async function clearFailures(ip: string): Promise<void> {
  await call({ identifier: ip, reset: true });
}

/**
 * Delay before answering a failed attempt, growing with the failure count.
 *
 * Even below the lockout threshold this slows scripted guessing, and costs an operator who
 * mistypes once almost nothing.
 */
export function failureDelayMs(failures: number): number {
  return Math.min(2000, 150 * Math.max(1, failures));
}
