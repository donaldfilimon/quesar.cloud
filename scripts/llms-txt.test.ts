import { describe, expect, it } from "vitest";
import { buildLlmsTxt, llmsPage } from "./llms-txt.ts";

const page = (path: string, title: string, description: string, extra = "", body = "") =>
  `<html><head><title>${title}</title><meta name="description" content="${description}"/>` +
  `<link rel="canonical" href="https://quesar.cloud${path}"/>${extra}</head><body>${body}</body></html>`;

describe("llmsPage", () => {
  it("takes the page's own title and description, decoding entities and the brand suffix", () => {
    expect(llmsPage(page("/terms", "Terms · Quesar", "What&#x27;s covered &amp; why"))).toEqual({
      loc: "https://quesar.cloud/terms",
      title: "Terms",
      description: "What's covered & why",
      historical: false,
    });
  });

  it("keeps the publication date and the historical marker", () => {
    const html = page(
      "/blog/why-zig",
      "Why WDBX Is Written in Zig — Blog",
      "An older post.",
      `<script type="application/ld+json">{"@type":"BlogPosting","datePublished":"2025-11-30T00:00:00.000Z"}</script>`,
      `<div data-historical-page=""><p>Historical</p></div>`,
    );
    expect(llmsPage(html)).toMatchObject({ published: "2025-11-30", historical: true });
  });

  it("skips pages the sitemap skips (noindex, server-only, no canonical)", () => {
    expect(
      llmsPage(page("/console", "Console", "d", `<meta name="robots" content="noindex"/>`)),
    ).toBeNull();
    expect(
      llmsPage(page("/login", "Sign in", "d", "", `<div data-server-only-page="">x</div>`)),
    ).toBeNull();
    expect(llmsPage(`<html><head><title>T</title></head></html>`)).toBeNull();
  });
});

describe("buildLlmsTxt", () => {
  const pages = [
    {
      loc: "https://quesar.cloud/blog/why-zig",
      title: "Why Zig",
      description: "Old.",
      published: "2025-11-30",
      historical: true,
    },
    {
      loc: "https://quesar.cloud/about",
      title: "About",
      description: "Who we are.",
      historical: false,
    },
    {
      loc: "https://quesar.cloud/",
      title: "Quesar by MLAI",
      description: "Private AI operations.",
      historical: false,
    },
    { loc: "https://quesar.cloud/blog", title: "Blog", description: "Notes.", historical: false },
    {
      loc: "https://quesar.cloud/widgets/one",
      title: "One",
      description: "A widget.",
      historical: false,
    },
  ];
  const text = buildLlmsTxt(pages, "Quesar");

  it("opens with the site name and the home page's own description", () => {
    expect(text.startsWith("# Quesar\n\n> Private AI operations.\n")).toBe(true);
  });

  it("groups pages into sections in a fixed order, unknown sections last", () => {
    const headings = [...text.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
    expect(headings).toEqual(["Site", "Blog", "Widgets"]);
  });

  it("lists the home page first in Site and the section index first in its section", () => {
    const site = text.split("## Site\n")[1].split("\n\n")[0].split("\n");
    expect(site[0]).toBe("- [Quesar by MLAI](https://quesar.cloud/): Private AI operations.");
    const blog = text.split("## Blog\n")[1].split("\n\n")[0].split("\n");
    expect(blog[0]).toBe("- [Blog](https://quesar.cloud/blog): Notes.");
  });

  it("carries the date and historical status on the line", () => {
    expect(text).toContain(
      "- [Why Zig](https://quesar.cloud/blog/why-zig): Old. (published 2025-11-30; historical)",
    );
  });
});
