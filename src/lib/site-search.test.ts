import { describe, expect, it } from "vitest";
import { rankHits, type SearchHit } from "./site-search";
import { searchCatalog } from "./site-search-catalog";

const hit = (title: string, href: string, body = ""): SearchHit => ({
  title,
  href,
  body,
  group: "Docs",
  category: "docs",
  external: false,
});

describe("site discovery", () => {
  it("ranks exact titles before prefixes before body matches", () => {
    const items = [hit("Memory", "/a", "ABI"), hit("ABI runtime", "/b"), hit("ABI", "/c")];
    expect(rankHits(items, "abi").map((h) => h.href)).toEqual(["/c", "/b", "/a"]);
  });
  it("normalizes both sides and requires all terms", () => {
    expect(rankHits([hit("ＡＢＩ Runtime", "/a")], "abi runtime")).toHaveLength(1);
    expect(rankHits([hit("ABI", "/a")], "abi missing")).toHaveLength(0);
  });
  it("deduplicates destinations but preserves queries and fragments", () => {
    const items = [
      hit("ABI", "/a"),
      hit("Duplicate ABI", "/a"),
      { ...hit("ABI node", "/a"), search: { node: "abi" } },
      { ...hit("ABI reference", "/a"), hash: "ref-runtime" },
    ];
    expect(rankHits(items, "abi")).toHaveLength(3);
  });
  it("filters categories, keeps stable ties, and limits results", () => {
    const items = Array.from({ length: 15 }, (_, i) => hit("ABI", `/${i}`));
    expect(rankHits(items, "abi")).toEqual(items.slice(0, 10));
    expect(rankHits(items, "", "source")).toEqual([]);
    expect(rankHits(items, "")).toEqual(items.slice(0, 8));
  });
  it("indexes real documentation anchors and preserves explicit source links", () => {
    expect(searchCatalog.some((h) => h.href === "/docs" && h.hash === "ref-runtime")).toBe(true);
    expect(searchCatalog.some((h) => h.external && h.href.includes("github.com/"))).toBe(true);
    expect(searchCatalog.some((h) => h.href === "/architecture" && h.search?.node)).toBe(true);
  });
});
