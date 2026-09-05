import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import { showcaseForSlug } from "@/lib/showcases";
import { ShowcaseLinksBar } from "@/components/showcase-links";
import { remarkPlugins, rehypePlugins } from "@/lib/markdown";
import { sharedMarkdownComponents } from "@/lib/markdown-components";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { coverImageFor, getPostBySlug, getPublishedPosts, readingTimeMinutes } from "@/lib/mudbase";

const SITE_ORIGIN = "https://blog.mudbase.dev";

/** Social/JSON-LD images must be absolute; a relative fallback path is resolved against the site origin. */
function absoluteCover(cover: string): string {
  return cover.startsWith("/") ? `${SITE_ORIGIN}${cover}` : cover;
}

export const revalidate = 300;

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const posts = await getPublishedPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Post not found" };

  const cover = absoluteCover(coverImageFor(post));

  return {
    title: post.title,
    description: post.excerpt,
    alternates: {
      canonical: `/posts/${slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [cover],
      type: "article",
      url: `/posts/${slug}`,
      publishedTime: post.publishedAt,
    },
    twitter: {
      card: "summary_large_image",
      site: "@mudbasedev",
      creator: "@mudbasedev",
      title: post.title,
      description: post.excerpt,
      images: [cover],
    },
  };
}

function stripTitleHeading(body: string, title: string): string {
  const firstHeadingPattern = new RegExp(`^#\\s+${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\n`);
  return body.replace(firstHeadingPattern, "");
}

// Routes markdown-embedded images through Next's server-side image proxy instead of
// linking directly to api.mudbase.dev - a direct cross-origin <img> load is blocked by
// Chrome (net::ERR_BLOCKED_BY_RESPONSE.NotSameOrigin) because that endpoint sends a
// Cross-Origin-Resource-Policy header. The proxy fetches server-side, sidestepping it.
function proxiedImageSrc(src: string): string {
  // 1920 must be one of next.config.ts's (default) images.deviceSizes entries - an
  // arbitrary width is rejected by the optimizer with a 400.
  return `/_next/image?url=${encodeURIComponent(src)}&w=1920&q=75`;
}

function MarkdownImage({ src, alt }: { src?: string; alt?: string }): React.JSX.Element | null {
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element -- plain img avoids next/image's fill/dimension requirements inside free-flowing prose content
  return <img src={proxiedImageSrc(src)} alt={alt ?? ""} loading="lazy" />;
}

export default async function PostPage({ params }: PostPageProps): Promise<React.JSX.Element> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) notFound();

  const content = stripTitleHeading(post.body, post.title);
  const showcase = showcaseForSlug(post.slug);
  const cover = coverImageFor(post);

  const postUrl = `https://blog.mudbase.dev/posts/${post.slug}`;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.excerpt,
      image: [absoluteCover(cover)],
      datePublished: post.publishedAt,
      dateModified: post.updatedAt ?? post.publishedAt,
      author: { "@type": "Person", name: post.author },
      publisher: {
        "@type": "Organization",
        name: "Mudbase",
        logo: { "@type": "ImageObject", url: "https://www.mudbase.dev/logo.png" },
      },
      url: postUrl,
      mainEntityOfPage: postUrl,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://blog.mudbase.dev" },
        {
          "@type": "ListItem",
          position: 2,
          name: post.category,
          item: `https://blog.mudbase.dev/category/${post.category.toLowerCase()}`,
        },
        { "@type": "ListItem", position: 3, name: post.title, item: postUrl },
      ],
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-14">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wide text-ink-400 transition hover:text-mud-600 dark:text-ink-300 dark:hover:text-mud-300"
        >
          ← All posts
        </Link>

        <div className="mb-5 flex items-center gap-3 font-mono text-xs uppercase tracking-wide text-mud-600 dark:text-mud-300">
          <Link href={`/category/${post.category.toLowerCase()}`} className="hover:text-clay-500">
            {post.category}
          </Link>
          <span aria-hidden="true" className="text-ink-300 dark:text-ink-600">·</span>
          <time dateTime={post.publishedAt}>{format(new Date(post.publishedAt), "MMMM d, yyyy")}</time>
          <span aria-hidden="true" className="text-ink-300 dark:text-ink-600">·</span>
          <span>{post.author}</span>
          <span aria-hidden="true" className="text-ink-300 dark:text-ink-600">·</span>
          <span>{readingTimeMinutes(post.body)} min read</span>
        </div>

        <h1 className="font-display text-3xl font-medium leading-tight text-ink-950 dark:text-ink-50 md:text-4xl">
          {post.title}
        </h1>

        <div className="relative my-10 aspect-[40/21] overflow-hidden rounded-xl border border-ink-200 bg-ink-100 dark:border-ink-700 dark:bg-ink-900">
          <Image src={cover} alt="" fill sizes="768px" className="object-cover" priority />
        </div>

        {showcase && <ShowcaseLinksBar links={showcase} />}

        <div className="prose-mud">
          <ReactMarkdown
            remarkPlugins={remarkPlugins}
            rehypePlugins={rehypePlugins}
            components={{ ...sharedMarkdownComponents, img: MarkdownImage }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
