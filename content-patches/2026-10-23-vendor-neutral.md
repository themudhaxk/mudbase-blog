# Content patch: vendor-neutral wording

Applied: 2026-10-23T04:51Z
Scan source: reports/r6-live-copy-vendor-dash-scan.md
Rule: do not publicly expose the vendors behind our products in any user-facing text.

## HIT-1: mudbase-cells-cloud-code-sandbox

Post ID: 6abe13bd4b5ecc6051a8b782
Slug: mudbase-cells-cloud-code-sandbox
Field: body

Before:
  - Python 3.12 with AI workflow libraries including `aider-chat`, `openai`, `anthropic`, and `litellm`

After:
  - Python 3.12 with common AI client libraries and workflow tooling preinstalled

Rationale: naming specific AI SDK packages associated with third-party vendors creates a visible
vendor association even when those packages are user-installable tools, not Mudbase internals.
The neutral phrasing still accurately describes the image capability.

## HIT-4: greatmindsng-consolidating-onto-mudbase

Post ID: 6a9579440bdd9d66329b3749
Slug: greatmindsng-consolidating-onto-mudbase
Field: excerpt (the part shown on the blog home listing card)

Before:
  GreatmindsNG built on Mudbase from its MVP, consolidated Cloudinary and a separate email
  subscription onto one platform, and cut about $90 a month - a real fintech app now heading
  to the app stores.

After:
  GreatmindsNG built on Mudbase from its MVP, consolidated file storage and email delivery onto
  one platform, and cut about $90 a month - a real fintech app now heading to the app stores.

Rationale: the excerpt named a specific third-party storage vendor in context of a product
(GreatmindsNG) owned by the operator. Rule: do not name vendors a product uses or used
in public-facing text. "File storage and email delivery" is accurate and vendor-neutral.

## Untouched vendor mentions (allowed per operator rules)

Competitor names (Supabase, Firebase, Appwrite, Clerk) appear in multiple posts as explicit
competitive comparisons and migration sources. These are allowed by rule.

MongoDB appears in engineering posts about Mudbase infrastructure and as a migration source.
Not a violation per the scan.

## Verification

Applied directly to Mudbase CMS via PATCH on the data API (2026-10-23T04:51:49Z).
Live verification: curl scan of all 77 published posts returned zero matches for
aider-chat, litellm, cloudinary after the patch.

## Blog redeploy notes

The blog at blog.mudbase.dev is a Next.js app on Vercel with ISR (revalidate 86400, tag "posts").
The admin PATCH route calls revalidateTag("posts") and revalidatePath("/") automatically after
each update, so the ISR cache was invalidated immediately when the patch was applied.

No full Vercel redeploy is needed for content-only changes.

If a forced rebuild is wanted: push to main (the Vercel project auto-deploys from main), or
run a manual deploy from the Vercel dashboard under the mudbase-blog project.
