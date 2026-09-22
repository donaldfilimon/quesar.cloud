import { describe, expect, it } from "vitest";
import { about } from "./categories/about";
import { blog } from "./categories/blog";
import { changelog } from "./categories/changelog";
import { docs } from "./categories/docs";
import { faq } from "./categories/faq";
import { industries } from "./categories/industries";
import { platform, runtime } from "./categories/platform";
import { productJourneys, startJourneys } from "./categories/product-journeys";
import { products } from "./categories/products";
import { projects } from "./categories/projects";
import { research } from "./categories/research";
import { refusals, services } from "./categories/services";
import { stats } from "./categories/stats";
import { team } from "./categories/team";
import { ContentSchema, DocsSchema, ProductsSchema, ProjectsSchema } from "./schemas";

// Ported from mlai src/__tests__/{content,docs-data,product-journeys,projects}.test.ts.
// Assertions tied to mlai-only files (Navbar, sitemap script, static Pages
// site, route-meta) are dropped; assertions that encode a deliberate quesar
// difference are adapted and say so.

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const content = { about, platform, industries, services, refusals, runtime, research, blog, team, stats, faq, products, changelog, docs, projects };

describe("content data layer", () => {
  it("validates against ContentSchema (no malformed entries)", () => {
    expect(() => ContentSchema.parse(content)).not.toThrow();
  });

  it("has every top-level category populated", () => {
    expect(about.values.length).toBeGreaterThan(0);
    expect(platform.length).toBeGreaterThan(0);
    expect(industries.length).toBeGreaterThan(0);
    expect(services.length).toBeGreaterThan(0);
    expect(research.publications.length).toBeGreaterThan(0);
    expect(blog.length).toBeGreaterThan(0);
    expect(team.length).toBeGreaterThan(0);
    expect(stats.length).toBeGreaterThan(0);
    expect(faq.length).toBeGreaterThan(0);
  });

  it("gives blog posts and papers unique, URL-safe slugs and renderable bodies", () => {
    for (const list of [blog.map((p) => p.slug), research.publications.map((p) => p.slug)]) {
      expect(new Set(list).size).toBe(list.length);
      for (const slug of list) expect(slug).toMatch(SLUG_RE);
    }
    for (const post of blog) {
      expect(post.excerpt.length).toBeGreaterThan(0);
      for (const section of post.body) {
        expect(section.paragraphs.length + (section.list?.length ?? 0)).toBeGreaterThan(0);
      }
    }
    for (const paper of research.publications) {
      expect(paper.abstract.length).toBeGreaterThan(0);
      expect(paper.body.length).toBeGreaterThan(0);
    }
  });

  it("exposes the founder profile with the fields the page needs", () => {
    const donald = team.find((m) => m.slug === "donald-filimon");
    expect(donald?.socials?.github).toBeTruthy();
    expect(donald?.focusAreas?.length ?? 0).toBeGreaterThan(0);
    expect(donald?.projects?.length ?? 0).toBeGreaterThan(0);
    expect(donald?.body?.length ?? 0).toBeGreaterThan(0);
  });
});

describe("docs corpus", () => {
  it("rejects malformed records", () => {
    expect(() => DocsSchema.parse([{ ...docs[0], slug: 42 }])).toThrow();
    expect(() => DocsSchema.parse([{ ...docs[0], sources: ["abi"] }])).toThrow();
  });

  // Adapted: mlai carried five docs and left runtime/wdbx to its hub page.
  // quesar's corpus is a superset, so assert the five are present and slugs are unique.
  it("contains mlai's five ported subjects plus quesar's own, uniquely", () => {
    const slugs = docs.map((d) => d.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of ["getting-started", "architecture", "identity", "gama", "evidence"]) expect(slugs).toContain(slug);
  });

  it("gives every section a heading and some content", () => {
    for (const doc of docs) {
      for (const section of doc.body) {
        expect(section.heading, `${doc.slug} section heading`).toBeTruthy();
        expect(section.paragraphs.length + (section.list?.length ?? 0), `${doc.slug} content`).toBeGreaterThan(0);
      }
    }
  });

  it("states the WDBX HNSW defaults the Rust source uses", () => {
    const wdbx = JSON.stringify(docs.find((d) => d.slug === "wdbx"));
    expect(wdbx).toContain("EF_CONSTRUCTION=40");
    expect(wdbx).toContain("EF_SEARCH=32");
  });
});

describe("product journeys", () => {
  it("gives four products schema-valid entries with explicit scope and real research links", () => {
    expect(products.map((product) => product.slug)).toEqual(["abi", "abbey", "wdbx", "quasar"]);
    expect(ProductsSchema.safeParse(products).success).toBe(true);
    for (const product of productJourneys) {
      expect(product.availability.length).toBeGreaterThan(8);
      expect(product.prerequisites.length).toBeGreaterThan(30);
      expect(product.limitation.length).toBeGreaterThan(30);
      expect(product.researchSlugs.length).toBeGreaterThan(0);
      for (const slug of product.researchSlugs) expect(research.publications.some((paper) => paper.slug === slug)).toBe(true);
    }
  });

  it("keeps the corrected implementation claims", () => {
    const abi = JSON.stringify(products.find((product) => product.slug === "abi"));
    expect(abi).toContain("deterministic rules");
    expect(abi).toContain("CUDA and Vulkan dispatch are not linked");
    expect(abi).not.toContain("production router uses a learned classifier");
    expect(productJourneys.find((product) => product.slug === "quasar")?.limitation).toContain("without authentication");
  });

  // Adapted: quesar deliberately points setup at its own pages (/workspace, /wdbx, /quesar) instead of GitHub READMEs.
  it("offers intent paths without pretending to launch a hosted session", () => {
    expect(startJourneys.map((journey) => journey.id)).toEqual(["research", "abbey", "mobile", "quasar"]);
    for (const href of [...productJourneys.map((product) => product.setupHref), ...startJourneys.map((j) => j.href)]) {
      expect(href).not.toMatch(/localhost|127\.0\.0\.1|\/login|\/console/);
    }
    expect(startJourneys.find((journey) => journey.id === "mobile")?.description).toContain("signed-device acceptance");
  });
});

describe("projects", () => {
  it("rejects a glyph outside the closed enum", () => {
    expect(() => ProjectsSchema.parse([{ ...projects[0], glyph: "bogus" }])).toThrow();
  });

  it("contains the four ported projects, each with a limit and a GitHub source", () => {
    expect(projects.map((p) => p.slug).sort()).toEqual(["abbey", "abi", "gama", "wdbx"]);
    for (const p of projects) {
      expect(p.limit, p.slug).toBeTruthy();
      expect(p.source.url, p.slug).toMatch(/^https:\/\/github\.com\//);
    }
  });

  // Adapted: quesar gives runtime and wdbx their own /docs/<slug> articles, so docsHref points there.
  it("resolves every docsHref to a real /docs/<slug> article", () => {
    const docSlugs = new Set(docs.map((d) => d.slug));
    for (const p of projects) {
      const match = /^\/docs\/([a-z0-9-]+)$/.exec(p.docsHref);
      expect(match, `${p.slug} -> ${p.docsHref}`).not.toBeNull();
      expect(docSlugs.has(match![1]!), `${p.slug} -> ${p.docsHref}`).toBe(true);
    }
  });
});
