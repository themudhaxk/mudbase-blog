import type { MetadataRoute } from "next";

/**
 * Crawler access rules.
 *
 * Pure training scrapers (those that download content for model training datasets
 * without providing search visibility or answer-engine citations) are blocked.
 * Retrieval agents that answer user queries and cite sources are NOT blocked here;
 * they bring referral visits and citations.
 *
 * Blocked: GPTBot, ClaudeBot, Anthropic-AI, CCBot, Bytespider, Google-Extended,
 * Diffbot, cohere-ai, AI2Bot, meta-externalagent, Applebot-Extended.
 *
 * NOT blocked (retrieval/answer-engine): ChatGPT-User, PerplexityBot, OAI-SearchBot,
 * and the generic wildcard (* rule allows everything else by default).
 */
const TRAINING_CRAWLERS = [
  "GPTBot",
  "ClaudeBot",
  "Anthropic-AI",
  "CCBot",
  "Bytespider",
  "Google-Extended",
  "Diffbot",
  "cohere-ai",
  "AI2Bot",
  "meta-externalagent",
  "Applebot-Extended",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Block pure training scrapers. Each entry needs its own rule object because
      // Next.js MetadataRoute does not support multiple userAgent strings in one rule.
      ...TRAINING_CRAWLERS.map((ua) => ({
        userAgent: ua,
        disallow: "/",
      })),
      // All other crawlers (search engines, link previewers, retrieval agents,
      // Googlebot, Bingbot, LinkedInBot, Slackbot, Twitterbot, etc.) crawl freely.
      { userAgent: "*", allow: "/" },
    ],
    sitemap: "https://blog.mudbase.dev/sitemap.xml",
  };
}
