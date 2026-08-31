# Mudbase Blog

The blog at [blog.mudbase.dev](https://blog.mudbase.dev). Next.js 15 (App Router) + TypeScript +
Tailwind CSS.

Every post is a document in a public Mudbase collection - this app has no database of its own.
It's a real, live demonstration of Mudbase's own generic data API serving as a headless CMS:
anonymous reads are scoped to `status: "published"` at the collection-permission level
(`{ role: "public", actions: ["read"], conditions: { "status": "published" } }`), enforced
server-side by Mudbase, not by a client-side filter.

## How content gets published

`/admin` is a small CMS: list, write, edit, publish and delete posts, with a markdown editor
(formatting, image upload, links, video embeds, colour) and a live preview. Drafts stay
invisible on the public site until published, because the collection's anonymous read grant is
conditioned on `status: "published"`.

Posts can also still be pushed straight into the `posts` collection via the data API - the
admin is a convenience over the same endpoints, not a gatekeeper. See `growth/queue/drafts/` in
the main workspace repo for post source markdown.

### Admin architecture

- **Auth** - one shared password, exchanged for a signed, 12-hour, httpOnly session cookie
  (`lib/admin-auth.ts`). Built on Web Crypto rather than `node:crypto` because `middleware.ts`
  runs on the Edge Runtime, where the Node module is unavailable.
- **Authorization** - `middleware.ts` redirects unauthenticated `/admin` navigation, but it is
  not the boundary: every `/api/admin/*` handler re-checks the session itself
  (`lib/require-admin.ts`), so a matcher change can't expose a write endpoint.
- **The API key never reaches the browser.** All writes go through Next route handlers that
  call `lib/mudbase-admin.ts`; the key lives only there.
- **Markdown** - `lib/markdown.ts` is the single pipeline used by *both* the published page and
  the editor preview, so the preview cannot drift from what readers get. Raw HTML is enabled so
  the colour and video controls have something to emit, which makes sanitising mandatory:
  `rehype-sanitize` runs against an allowlist, span styles are clamped to a single `color:`
  declaration, and iframes are dropped unless they point at YouTube, Vimeo or Loom.
  `npm run verify:markdown` asserts all of that and fails the build if it regresses.

### Admin credentials

Generate a full set - sign-in password, session secret, and a least-privilege API key - with:

```bash
flyctl ssh console -a mudbase-server \
  -C "node scripts/createBlogAdminCreds.js --password='<password>'"
```

It prints the three environment variables to set on the Vercel project. Every secret is shown
once. Pass `--rotate` to retire the previous key. See `.env.example` for what each one does.

## Data flow

`lib/mudbase.ts` fetches:

```
GET https://api.mudbase.dev/api/data/projects/{MUDBASE_PROJECT_ID}/collections/{MUDBASE_COLLECTION_ID}/data?filter={"status":"published"}
```

No API key is sent - the request is genuinely anonymous, matching the collection's own
permission grant. Pages revalidate on a 300-second ISR window, so a newly published post shows
up without a redeploy.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

The public site runs with no configuration. To use `/admin` locally, fill in
`BLOG_ADMIN_PASSWORD`, `BLOG_ADMIN_SECRET` and `MUDBASE_API_KEY` in `.env.local` - note that
this writes to the **live** posts collection, so work in drafts.

Checks:

```bash
npm run verify:markdown   # markdown sanitising + embed allowlist
npx tsc --noEmit
npx eslint .
```

## Deploy

Deployed on Vercel, mapped to `blog.mudbase.dev` as a subdomain of the existing
`mudbase.dev` Vercel-managed domain.
