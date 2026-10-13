import type { MetadataRoute } from "next";

/**
 * AI training crawler rules.
 *
 * Blocking rule rationale: AI training crawlers hit every page on the site at high frequency,
 * triggering Security Checkpoint edge-function invocations (Fluid CPU cost) on each request.
 * They do not contribute to search ranking or link previews. Search crawlers and social preview
 * bots (which ARE useful) are listed under the allow-all wildcard rule and remain unaffected.
 *
 * Crawlers blocked: GPTBot (OpenAI), ClaudeBot/Anthropic-AI (Anthropic), CCBot (Common Crawl),
 * Bytespider (ByteDance), Google-Extended (Google AI training only, separate from Googlebot),
 * PerplexityBot, meta-externalagent (Meta AI), Diffbot, cohere-ai, AI2Bot.
 */
const AI_TRAINING_CRAWLERS = [
  "GPTBot",
  "ClaudeBot",
  "Anthropic-AI",
  "CCBot",
  "Bytespider",
  "Google-Extended",
  "PerplexityBot",
  "meta-externalagent",
  "Diffbot",
  "cohere-ai",
  "AI2Bot",
  "ChatGPT-User",
  "Applebot-Extended",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Block AI training crawlers from indexing the blog for training purposes.
      // Each entry needs its own rule object because Next.js MetadataRoute does not
      // support a single rule with multiple userAgent strings.
      ...AI_TRAINING_CRAWLERS.map((ua) => ({
        userAgent: ua,
        disallow: "/",
      })),
      // All other crawlers (Googlebot, Bingbot, LinkedInBot, Slackbot, Twitterbot, etc.)
      // can crawl freely.
      { userAgent: "*", allow: "/" },
    ],
    sitemap: "https://blog.mudbase.dev/sitemap.xml",
  };
}
