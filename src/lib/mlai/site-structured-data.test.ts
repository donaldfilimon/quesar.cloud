import { describe, expect, it } from "vitest";
import { site } from "@/lib/site-identity";
import { SITE_URL, breadcrumbLd, siteGraphLd, stripBrandSuffix } from "./site-structured-data";

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

  it("title-cases segments missing from nav", () => {
    const list = breadcrumbLd("/some-section/page", "Page")!;
    expect(list.itemListElement.map((i) => i.name)).toEqual(["Home", "Some Section", "Page"]);
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
