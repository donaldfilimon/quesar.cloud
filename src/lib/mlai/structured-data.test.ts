import { describe, expect, it } from "vitest";
import { blog } from "./categories/blog";
import { docs } from "./categories/docs";
import { products } from "./categories/products";
import { projects } from "./categories/projects";
import { research } from "./categories/research";
import { team } from "./categories/team";
import {
  SITE_URL,
  blogPostingLd,
  docLd,
  jsonLdScript,
  personLd,
  projectLd,
  researchArticleLd,
  serializeJsonLd,
  softwareApplicationLd,
} from "./structured-data";

// Ported from mlai src/__tests__/structured-data.test.ts, plus the serializer
// and the doc/project builders quesar now emits.
describe("structured-data", () => {
  it("blogPostingLd produces a valid, serializable BlogPosting", () => {
    const post = blog[0];
    if (!post) throw new Error("fixture: no blog post");
    const ld = blogPostingLd(post);
    expect(ld["@type"]).toBe("BlogPosting");
    expect(ld.url).toBe(`${SITE_URL}/blog/${post.slug}`);
    expect(ld.headline).toBe(post.title);
    expect(() => JSON.stringify(ld)).not.toThrow();
  });

  it("researchArticleLd splits a real middle-dot byline into separate Organizations", () => {
    const paper = research.publications.find((p) => p.slug === "wdbx-weighted-backtrace-memory-store");
    if (!paper) throw new Error("fixture: wdbx-weighted-backtrace-memory-store is missing");
    expect(paper.authors).toBe("MLAI Research · WDBX Core");
    expect(researchArticleLd(paper).author).toEqual([
      { "@type": "Organization", name: "MLAI Research" },
      { "@type": "Organization", name: "WDBX Core" },
    ]);
  });

  it("researchArticleLd types every content-layer byline as an Organization, never a Person", () => {
    for (const paper of research.publications) {
      const authors = researchArticleLd(paper).author;
      for (const entry of Array.isArray(authors) ? authors : [authors]) {
        expect(entry["@type"]).toBe("Organization");
        expect(entry.name.length).toBeGreaterThan(0);
      }
    }
  });

  it("researchArticleLd still splits a comma-separated byline, trimming empties", () => {
    const base = research.publications[0];
    if (!base) throw new Error("fixture: no research publication");
    expect(researchArticleLd({ ...base, authors: "MLAI Research, WDBX Core, " }).author).toEqual([
      { "@type": "Organization", name: "MLAI Research" },
      { "@type": "Organization", name: "WDBX Core" },
    ]);
  });

  it("researchArticleLd falls back to the Organization when the byline is blank", () => {
    const base = research.publications[0];
    if (!base) throw new Error("fixture: no research publication");
    expect(researchArticleLd({ ...base, authors: "  ·  " }).author).toMatchObject({
      "@type": "Organization",
      name: "MLAI Corporation",
    });
  });

  it("blogPostingLd applies the same byline rule (team names are not People)", () => {
    const post = blog.find((p) => p.author?.includes("·"));
    if (!post) throw new Error("fixture: no blog post with a multi-unit byline");
    const expected = post.author!.split("·").map((name) => name.trim());
    expect(blogPostingLd(post).author).toEqual(expected.map((name) => ({ "@type": "Organization", name })));
  });

  it("personLd includes sameAs links only for socials the member actually has", () => {
    const withGithub = team.find((m) => m.socials?.github);
    if (!withGithub) throw new Error("fixture: no team member with a github social");
    const ld = personLd(withGithub);
    expect(ld["@type"]).toBe("Person");
    expect(ld.sameAs).toContain(`https://github.com/${withGithub.socials!.github}`);
  });

  it("softwareApplicationLd produces a SoftwareApplication with no unstated pricing claim", () => {
    const product = products[0];
    if (!product) throw new Error("fixture: no product");
    const ld = softwareApplicationLd(product);
    expect(ld["@type"]).toBe("SoftwareApplication");
    expect(ld.url).toBe(`${SITE_URL}/products/${product.slug}`);
    expect(ld).not.toHaveProperty("offers");
  });

  it("docLd publishes no fabricated dates", () => {
    const ld = docLd(docs[0]!);
    expect(ld["@type"]).toBe("TechArticle");
    expect(ld).not.toHaveProperty("datePublished");
    expect(ld).not.toHaveProperty("dateModified");
  });

  it("projectLd names the source repository", () => {
    const project = projects[0]!;
    expect(projectLd(project)).toMatchObject({ "@type": "SoftwareSourceCode", codeRepository: project.source.url });
  });

  it("serializeJsonLd cannot close its script tag and round-trips", () => {
    const value = { text: "</script><script>alert(1)</script>", sep: "a\u2028b\u2029c" };
    const out = serializeJsonLd(value);
    expect(out).not.toContain("</script");
    expect(out).not.toMatch(/[\u2028\u2029]/);
    expect(JSON.parse(out)).toEqual(value);
    expect(jsonLdScript(value)).toEqual({ type: "application/ld+json", children: out });
  });
});
