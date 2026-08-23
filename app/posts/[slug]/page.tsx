import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getPostBySlug, getPublishedPosts } from "@/lib/mudbase";

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

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [post.coverImage],
      type: "article",
      publishedTime: post.publishedAt,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [post.coverImage],
    },
  };
}

function stripTitleHeading(body: string, title: string): string {
  const firstHeadingPattern = new RegExp(`^#\\s+${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\n`);
  return body.replace(firstHeadingPattern, "");
}

// Routes markdown-embedded images through Next's server-side image proxy instead of
// linking directly to api.mudbase.dev — a direct cross-origin <img> load is blocked by
// Chrome (net::ERR_BLOCKED_BY_RESPONSE.NotSameOrigin) because that endpoint sends a
// Cross-Origin-Resource-Policy header. The proxy fetches server-side, sidestepping it.
function proxiedImageSrc(src: string): string {
  // 1920 must be one of next.config.ts's (default) images.deviceSizes entries — an
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

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-14">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wide text-ink-400 transition hover:text-mud-600 dark:hover:text-mud-300"
        >
          ← All posts
        </Link>

        <div className="mb-5 flex items-center gap-3 font-mono text-xs uppercase tracking-wide text-mud-600 dark:text-mud-300">
          <Link href={`/category/${post.category.toLowerCase()}`} className="hover:text-clay-500">
            {post.category}
          </Link>
          <span className="text-ink-300 dark:text-ink-600">·</span>
          <time dateTime={post.publishedAt}>{format(new Date(post.publishedAt), "MMMM d, yyyy")}</time>
          <span className="text-ink-300 dark:text-ink-600">·</span>
          <span>{post.author}</span>
        </div>

        <h1 className="font-display text-3xl font-medium leading-tight text-ink-950 dark:text-ink-50 md:text-4xl">
          {post.title}
        </h1>

        <div className="relative my-10 aspect-[16/9] overflow-hidden rounded-xl border border-ink-200 bg-ink-100 dark:border-ink-700 dark:bg-ink-900">
          <Image src={post.coverImage} alt="" fill sizes="768px" className="object-cover" priority />
        </div>

        <div className="prose-mud">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{ img: MarkdownImage }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
