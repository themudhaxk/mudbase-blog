/**
 * Session handling for the blog admin.
 *
 * Deliberately small: this gates one internal author surface, not a user system. There is one
 * shared password, and a successful login mints a signed, expiring cookie. No user records, no
 * password database, nothing to leak beyond the one secret already in the environment.
 *
 * Built on Web Crypto rather than node:crypto because middleware.ts runs on the Edge Runtime,
 * where the Node module is unavailable - a node:crypto version builds fine and then throws on
 * the first request that hits the middleware. That is what makes every function here async.
 *
 * Everything is server-only. `BLOG_ADMIN_PASSWORD` and `BLOG_ADMIN_SECRET` must never be given
 * a NEXT_PUBLIC_ prefix - that would compile them into the browser bundle and publish the
 * admin password to every visitor.
 */

export const ADMIN_COOKIE = "mb-blog-admin";

/** Sessions expire so a stolen or forgotten cookie stops working on its own. */
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

const encoder = new TextEncoder();

function secret(): string {
  const s = process.env.BLOG_ADMIN_SECRET;
  if (!s || s.length < 16) {
    // Failing loudly beats signing sessions with a weak or absent key: an empty secret would
    // make every token forgeable by anyone who guesses the payload format.
    throw new Error("BLOG_ADMIN_SECRET must be set to at least 16 characters");
  }
  return s;
}

async function hmacKey(rawKey: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(rawKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sign(payload: string): Promise<string> {
  const key = await hmacKey(secret());
  return toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
}

/**
 * Compare two strings without leaking their contents through timing.
 *
 * Both sides are HMAC'd first so the comparison always runs over equal-length digests -
 * comparing the raw values would make length itself an oracle.
 */
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const key = await hmacKey("constant-time-compare");
  const [ah, bh] = await Promise.all([
    crypto.subtle.sign("HMAC", key, encoder.encode(a)),
    crypto.subtle.sign("HMAC", key, encoder.encode(b)),
  ]);
  const av = new Uint8Array(ah);
  const bv = new Uint8Array(bh);
  let diff = av.length ^ bv.length;
  for (let i = 0; i < av.length; i += 1) diff |= av[i] ^ bv[i];
  return diff === 0;
}

/** True when the supplied password matches the configured one. */
export async function passwordMatches(supplied: string): Promise<boolean> {
  const expected = process.env.BLOG_ADMIN_PASSWORD;
  if (!expected) return false;
  return safeEqual(supplied, expected);
}

/** Mint a session token: `<expiry>.<nonce>.<hmac>`. */
export async function createSessionToken(): Promise<string> {
  const expires = Date.now() + SESSION_TTL_MS;
  const nonce = toHex(crypto.getRandomValues(new Uint8Array(12)).buffer);
  const payload = `${expires}.${nonce}`;
  return `${payload}.${await sign(payload)}`;
}

/** Verify a session token's signature and expiry. */
export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [expiresRaw, nonce, mac] = parts;

  let expectedMac: string;
  try {
    expectedMac = await sign(`${expiresRaw}.${nonce}`);
  } catch {
    return false; // misconfigured secret - refuse rather than accept
  }
  if (!(await safeEqual(mac, expectedMac))) return false;

  const expires = Number(expiresRaw);
  return Number.isFinite(expires) && expires > Date.now();
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true, // unreadable from JavaScript, so an XSS can't lift the session
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_MS / 1000,
};
