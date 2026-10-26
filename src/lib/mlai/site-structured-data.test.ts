import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { site } from "@/lib/site-identity";
import {
  BREADCRUMB_SECTIONS,
  ORGANIZATION_ID,
  SITE_URL,
  breadcrumbLd,
  siteGraphLd,
  stripBrandSuffix,
} from "./site-structured-data";

const SAME_AS = [
  "https://github.com/donaldfilimon/quesar.cloud",
  "https://github.com/donaldfilimon/abi",
  "https://github.com/donaldfilimon/wdbx",
  "https://github.com/donaldfilimon/abbey",
  "https://github.com/donaldfilimon/skill-creator",
  "https://github.com/donaldfilimon/gama",
];

describe("siteGraphLd", () => {
  const graph = siteGraphLd();
  const website = graph["@graph"].find((n) => n["@type"] === "WebSite")!;
  const org = graph["@graph"].find((n) => n["@type"] === "Organization")!;

  it("has a WebSite and an Organization with stable ids", () => {
    expect(graph["@context"]).toBe("https://schema.org");
    expect(website["@id"]).toBe("https://quesar.cloud/#website");
    expect(org["@id"]).toBe("https://quesar.cloud/#organization");
    expect(SITE_URL).toBe("https://quesar.cloud");
  });

  it("points the WebSite publisher at the Organization", () => {
    expect(website).toMatchObject({
      url: "https://quesar.cloud/",
      name: site.name,
      description: site.description,
      inLanguage: "en",
      publisher: { "@id": "https://quesar.cloud/#organization" },
    });
    expect(website).not.toHaveProperty("potentialAction");
  });

  it("carries the organization identity and sameAs list", () => {
    expect(org).toMatchObject({
      name: site.company,
      url: "https://quesar.cloud/",
      logo: "https://quesar.cloud/apple-touch-icon.png",
      email: site.contact.email,
      telephone: site.contact.phoneInternational,
      description: site.mission,
      sameAs: SAME_AS,
    });
  });

  it("round-trips through JSON", () => {
    expect(JSON.parse(JSON.stringify(graph))).toEqual(graph);
  });
});

describe("stripBrandSuffix", () => {
  it.each([
    ["Some Post · Quesar", "Some Post"],
    ["Some Post — Quesar", "Some Post"],
    ["Some Post | Quesar", "Some Post"],
    ["Some Post — MLAI", "Some Post"],
    ["Some Post: Quesar by MLAI", "Some Post"],
    ["Quesar roadmap notes", "Quesar roadmap notes"],
    ["Plain Title", "Plain Title"],
    ["Film — Showcase", "Film"],
    ["Sites — Quasar · Quesar", "Sites"],
    ["Start with the source. — Docs", "Start with the source."],
    ["Some Note — Blog · Quesar", "Some Note"],
    ["Paper — MLAI research", "Paper"],
    ["Readme — Source", "Readme"],
    ["Pose detection demo — Quesar by MLAI", "Pose detection demo"],
    ["Docs", "Docs"],
    [" — Docs", " — Docs"],
  ])("%s -> %s", (input, expected) => {
    expect(stripBrandSuffix(input)).toBe(expected);
  });
});

describe("breadcrumbLd", () => {
  it("is null for the home page", () => {
    expect(breadcrumbLd("/", "Home")).toBeNull();
  });

  it("builds Home / Section / Page with absolute urls", () => {
    expect(breadcrumbLd("/blog/some-post", "Some Post · Quesar")).toEqual({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://quesar.cloud/" },
        { "@type": "ListItem", position: 2, name: "Blog", item: "https://quesar.cloud/blog" },
        {
          "@type": "ListItem",
          position: 3,
          name: "Some Post",
          item: "https://quesar.cloud/blog/some-post",
        },
      ],
    });
  });

  it("uses the nav label when the prefix is a nav item", () => {
    const list = breadcrumbLd("/research/paper", "Paper")!;
    expect(list.itemListElement[1]!.name).toBe("Research");
  });

  it("title-cases listed section prefixes missing from nav", () => {
    const list = breadcrumbLd("/research/implementations/page", "Page")!;
    expect(list.itemListElement.map((i) => i.name)).toContain("Implementations");
  });

  it("ignores trailing slashes", () => {
    const list = breadcrumbLd("/products/", "Products · Quesar")!;
    expect(list.itemListElement).toHaveLength(2);
    expect(list.itemListElement[1]).toMatchObject({
      name: "Products",
      item: "https://quesar.cloud/products",
    });
  });

  it("keeps a title without a brand suffix whole", () => {
    const list = breadcrumbLd("/x", "Quesar and friends")!;
    expect(list.itemListElement[1]!.name).toBe("Quesar and friends");
  });
});

describe("breadcrumb section prefixes", () => {
  it("lists only prefixes that have an index route file", () => {
    for (const prefix of BREADCRUMB_SECTIONS) {
      const file = `${prefix.slice(1).replace(/\//g, ".")}.tsx`;
      expect(existsSync(resolve(__dirname, "../../routes", file)), prefix).toBe(true);
    }
  });

  it("skips intermediate prefixes that are not pages", () => {
    const list = breadcrumbLd("/quasar/sites", "Sites — Quasar · Quesar")!;
    expect(list.itemListElement.map((i) => [i.name, i.item])).toEqual([
      ["Home", "https://quesar.cloud/"],
      ["Sites", "https://quesar.cloud/quasar/sites"],
    ]);
    expect(list.itemListElement.map((i) => i.position)).toEqual([1, 2]);
  });

  it("keeps real section crumbs and strips section suffixes from the last", () => {
    const list = breadcrumbLd("/showcase/film", "Film — Showcase")!;
    expect(list.itemListElement.map((i) => i.name)).toEqual(["Home", "Showcase", "Film"]);
    const deep = breadcrumbLd("/research/implementations/x", "X — MLAI research")!;
    expect(deep.itemListElement.map((i) => i.item)).toEqual([
      "https://quesar.cloud/",
      "https://quesar.cloud/research",
      "https://quesar.cloud/research/implementations",
      "https://quesar.cloud/research/implementations/x",
    ]);
  });

  it("exports the organization id used by the site graph", () => {
    expect(ORGANIZATION_ID).toBe("https://quesar.cloud/#organization");
  });
});
