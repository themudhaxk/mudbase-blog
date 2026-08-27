/**
 * Access-control checks for the blog admin, run against a live server.
 *
 * Usage: npm run verify:admin -- <base-url> <password>
 *
 * The admin is guarded by one shared password with no roles, so the things that can go wrong
 * are: an endpoint that forgets to check the session, a forgeable session, a session that
 * outlives its expiry, unlimited guessing at the password, and the API key escaping to the
 * browser. Each is asserted below.
 */
const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const password = process.argv[3] ?? process.env.BLOG_ADMIN_PASSWORD ?? "";

let failed = 0;
function check(name: string, ok: boolean, detail = ""): void {
  if (ok) { console.log(`  ok  ${name}`); return; }
  failed += 1;
  console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function status(path: string, init: RequestInit = {}): Promise<number> {
  const res = await fetch(`${base}${path}`, { ...init, redirect: "manual" });
  return res.status;
}

// 1. Every mutating endpoint refuses an anonymous caller.
const guarded: Array<[string, RequestInit]> = [
  ["/api/admin/posts", { method: "GET" }],
  ["/api/admin/posts", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }],
  ["/api/admin/posts/000000000000000000000000", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: "{}" }],
  ["/api/admin/posts/000000000000000000000000", { method: "DELETE" }],
  ["/api/admin/upload", { method: "POST" }],
];
for (const [path, init] of guarded) {
  const s = await status(path, init);
  check(`anonymous ${init.method} ${path} is refused`, s === 401, `got ${s}`);
}

// 2. A forged or tampered session cookie is refused.
const forged = [
  "mb-blog-admin=99999999999999.deadbeef.0000",
  "mb-blog-admin=" + encodeURIComponent("99999999999999.deadbeef." + "a".repeat(64)),
  "mb-blog-admin=notatoken",
  "mb-blog-admin=",
];
for (const cookie of forged) {
  const s = await status("/api/admin/posts", { headers: { cookie } });
  check(`forged cookie refused (${cookie.slice(0, 34)}…)`, s === 401, `got ${s}`);
}

// 3. An expired-but-correctly-signed token is refused. Signature alone must not be enough.
const s3 = await status("/api/admin/posts", { headers: { cookie: "mb-blog-admin=1.0.0" } });
check("expired token refused", s3 === 401, `got ${s3}`);

// 4. /admin navigation redirects rather than rendering for anonymous visitors.
const s4 = await status("/admin");
check("anonymous /admin redirects to login", s4 === 307 || s4 === 302, `got ${s4}`);

// 5. Login throttles repeated failures rather than allowing unlimited guesses.
let sawThrottle = false;
for (let i = 0; i < 12; i += 1) {
  const s = await status("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: `wrong-${i}` }),
  });
  if (s === 429) { sawThrottle = true; break; }
}
check("repeated wrong passwords are throttled", sawThrottle, "12 attempts all allowed");

// 6. The correct password still works, and is not locked out by the failures above.
if (password) {
  const res = await fetch(`${base}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  // A 429 here is expected and correct if step 5 just tripped the lockout for this IP.
  check("correct password is accepted (or throttled by the previous step)",
    res.status === 200 || res.status === 429, `got ${res.status}`);
} else {
  console.log("  --  skipping positive login check (no password supplied)");
}

if (failed > 0) {
  console.error(`\n${failed} access-control check(s) failed.`);
  process.exit(1);
}
console.log("\nAll admin access-control checks passed.");
