# Mudbase Blog

The blog at [blog.mudbase.dev](https://blog.mudbase.dev). Next.js 15 (App Router) + TypeScript +
Tailwind CSS.

Every post is a document in a public Mudbase collection — this app has no database, no CMS
admin, and no auth of its own. It's a real, live demonstration of Mudbase's own generic data
API serving as a headless CMS: anonymous reads are scoped to `status: "published"` at the
collection-permission level (`{ role: "public", actions: ["read"], conditions: { "status":
"published" } }`), enforced server-side by Mudbase, not by a client-side filter.

## How content gets published

Posts are written and pushed directly into the `posts` collection via Mudbase's data API using
a write-scoped API key (`{ resource: "database", actions: ["create", "read", "update"] }`) —
there's no publishing UI in this repo by design. See the `growth/queue/drafts/` posts in the
main workspace repo for the current post source markdown.

## Data flow

`lib/mudbase.ts` fetches:

```
GET https://api.mudbase.dev/api/data/projects/{MUDBASE_PROJECT_ID}/collections/{MUDBASE_COLLECTION_ID}/data?filter={"status":"published"}
```

No API key is sent — the request is genuinely anonymous, matching the collection's own
permission grant. Pages revalidate on a 300-second ISR window, so a newly published post shows
up without a redeploy.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Deploy

Deployed on Vercel, mapped to `blog.mudbase.dev` as a subdomain of the existing
`mudbase.dev` Vercel-managed domain.
