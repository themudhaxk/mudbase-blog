import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { coverImageFor, readingTimeMinutes, type Post } from "@/lib/mudbase";

interface PostCardProps {
  post: Post;
  featured?: boolean;
}

export function PostCard({ post, featured = false }: PostCardProps): React.JSX.Element {
  return (
    <article className="grid grid-cols-1 gap-4">
      <Link href={`/posts/${post.slug}`} className="group block">
        <div className="relative aspect-[40/21] overflow-hidden rounded-xl border border-ink-200 bg-ink-100 dark:border-ink-700 dark:bg-ink-900">
          <Image
            src={coverImageFor(post)}
            alt=""
            fill
            sizes={featured ? "100vw" : "(min-width: 768px) 50vw, 100vw"}
            className="object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        </div>
      </Link>
      <div>
        <div className="mb-2 flex items-center gap-3 font-mono text-xs uppercase tracking-wide text-mud-600 dark:text-mud-300">
          <Link href={`/category/${post.category.toLowerCase()}`} className="hover:text-clay-500">
            {post.category}
          </Link>
          <span className="text-ink-300 dark:text-ink-600">·</span>
          <time dateTime={post.publishedAt}>{format(new Date(post.publishedAt), "MMM d, yyyy")}</time>
        </div>
        <Link href={`/posts/${post.slug}`} className="group block">
          <h2
            className={`font-display font-medium leading-snug text-ink-950 transition group-hover:text-mud-600 dark:text-ink-50 dark:group-hover:text-mud-300 ${
              featured ? "text-2xl md:text-3xl" : "text-xl"
            }`}
          >
            {post.title}
          </h2>
          <p className="mt-2 line-clamp-2 text-[15px] leading-relaxed text-ink-600 dark:text-ink-300">
            {post.excerpt}
          </p>
        </Link>
        <div className="mt-3 flex items-center gap-2 font-mono text-xs text-ink-400 dark:text-ink-500">
          <span>{post.author || "Mudbase Team"}</span>
          <span aria-hidden="true">·</span>
          <span>{readingTimeMinutes(post.body)} min read</span>
        </div>
      </div>
    </article>
  );
}
