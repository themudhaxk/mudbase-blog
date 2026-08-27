/**
 * Brute-force throttling for the admin login.
 *
 * The whole admin is gated by one shared password, so that password is the entire attack
 * surface — and without throttling an attacker gets unlimited, free guesses at it.
 *
 * Two honest caveats about doing this on Vercel:
 *
 *  - The counter is per-instance and in-memory. Serverless functions scale out and are
 *    recycled, so a determined attacker spread across enough concurrent instances sees a
 *    higher effective ceiling than the number below, and counts reset on cold start. This
 *    raises the cost of guessing considerably; it is not an absolute cap. Vercel's own
 *    firewall rate-limiting is the durable answer if this ever needs to be one.
 *  - It is keyed on IP, which is neither stable nor unique per person. That is acceptable
 *    here in a way it was not for signup gating: the failure mode is a 15-minute delay on one
 *    internal surface with a known operator, not a stranger being refused an account.
 */

/** Failures allowed from one address before it is refused for the rest of the window. */
const MAX_FAILURES = 8;
const WINDOW_MS = 15 * 60 * 1000;

/** Bounded so a flood of unique addresses cannot grow this map without limit. */
const MAX_TRACKED = 10_000;

interface Attempt {
  count: number;
  resetAt: number;
}

const attempts = new Map<string, Attempt>();

/**
 * The client address as Vercel determined it.
 *
 * `x-vercel-forwarded-for` is set by Vercel's edge; `x-forwarded-for` is not safe to read
 * leftmost because a client can send it themselves, which would let an attacker mint a fresh
 * throttle bucket per request.
 */
export function clientIp(headers: Headers): string {
  const vercel = headers.get("x-vercel-forwarded-for");
  if (vercel) return vercel.split(",")[0].trim();
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  // Local development only — in production one of the two above is always present.
  return "unknown";
}

function sweep(now: number): void {
  for (const [key, attempt] of attempts) {
    if (attempt.resetAt <= now) attempts.delete(key);
  }
}

export interface ThrottleState {
  blocked: boolean;
  retryAfterSeconds: number;
  /** Consecutive failures already recorded for this address. */
  failures: number;
}

/** Current state for an address, without recording anything. */
export function checkThrottle(ip: string): ThrottleState {
  const now = Date.now();
  const attempt = attempts.get(ip);
  if (!attempt || attempt.resetAt <= now) {
    return { blocked: false, retryAfterSeconds: 0, failures: 0 };
  }
  return {
    blocked: attempt.count >= MAX_FAILURES,
    retryAfterSeconds: Math.max(1, Math.ceil((attempt.resetAt - now) / 1000)),
    failures: attempt.count,
  };
}

/** Record a failed attempt and return the updated state. */
export function recordFailure(ip: string): ThrottleState {
  const now = Date.now();
  sweep(now);

  // Under a flood of unique addresses, stop tracking new ones rather than grow without
  // bound. Existing counters keep working, so an attacker cannot evict their own entry.
  if (!attempts.has(ip) && attempts.size >= MAX_TRACKED) {
    return { blocked: false, retryAfterSeconds: 0, failures: 0 };
  }

  const existing = attempts.get(ip);
  const attempt =
    existing && existing.resetAt > now ? existing : { count: 0, resetAt: now + WINDOW_MS };
  attempt.count += 1;
  attempts.set(ip, attempt);

  return {
    blocked: attempt.count >= MAX_FAILURES,
    retryAfterSeconds: Math.max(1, Math.ceil((attempt.resetAt - now) / 1000)),
    failures: attempt.count,
  };
}

/** Clear an address's failures. Called on a successful sign-in. */
export function clearFailures(ip: string): void {
  attempts.delete(ip);
}

/**
 * Delay applied before answering a failed attempt, growing with the number of failures.
 *
 * Even below the lockout threshold this makes scripted guessing far slower, and the cost to a
 * legitimate operator who mistypes once is imperceptible.
 */
export function failureDelayMs(failures: number): number {
  return Math.min(2000, 150 * failures);
}
