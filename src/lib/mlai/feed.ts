/**
 * RSS 2.0 feed builder, pure and testable. Ported from mlai `src/lib/feed.ts`;
 * the `/feed.xml` server route is a thin wrapper.
 *
 * Items are every blog post and every research publication, unified and sorted
 * newest first. Human-readable dates ("June 9, 2026", "JUNE 2026") are parsed
 * best-effort; an unparseable date sorts last and omits <pubDate> rather than
 * emitting an invalid RFC-822 string.
 */

import { site } from "@/lib/content";
import { blog } from "./categories/blog";
import { research } from "./categories/research";
import { parseContentDate } from "./dates";
import { SITE_URL } from "./structured-data";

export { parseContentDate } from "./dates";

export interface FeedItem {
  title: string;
  link: string;
  description: string;
  category: string;
  author?: string;
  /** ms epoch, or null when the human date string couldn't be parsed. */
  timestamp: number | null;
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function collectFeedItems(): FeedItem[] {
  const posts: FeedItem[] = blog.map((p) => ({
    title: p.title,
    link: `${SITE_URL}/blog/${p.slug}`,
    description: p.excerpt,
    category: p.tag,
    author: p.author,
    timestamp: parseContentDate(p.date),
  }));

  const papers: FeedItem[] = research.publications.map((p) => ({
    title: p.title,
    link: `${SITE_URL}/research/${p.slug}`,
    description: p.abstract,
    category: p.tag,
    author: p.authors,
    timestamp: parseContentDate(p.date),
  }));

  return [...posts, ...papers].sort(
    (a, b) => (b.timestamp ?? -Infinity) - (a.timestamp ?? -Infinity),
  );
}

export function buildRssFeed(now: Date = new Date()): string {
  const itemXml = collectFeedItems()
    .map((item) => {
      const lines = [
        "    <item>",
        `      <title>${escapeXml(item.title)}</title>`,
        `      <link>${escapeXml(item.link)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(item.link)}</guid>`,
        `      <description>${escapeXml(item.description)}</description>`,
        `      <category>${escapeXml(item.category)}</category>`,
      ];
      if (item.author) lines.push(`      <dc:creator>${escapeXml(item.author)}</dc:creator>`);
      if (item.timestamp !== null)
        lines.push(`      <pubDate>${new Date(item.timestamp).toUTCString()}</pubDate>`);
      lines.push("    </item>");
      return lines.join("\n");
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>MLAI Corporation — Lab Notes &amp; Research</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(site.description)}</description>
    <language>en-us</language>
    <lastBuildDate>${now.toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
${itemXml}
  </channel>
</rss>
`;
}
