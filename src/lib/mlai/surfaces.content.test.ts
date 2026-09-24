import { describe, expect, it } from "vitest";

import { appSurfaces } from "@/lib/catalog";

import { abbeyRequirements, productJourneys, startJourneys } from "./categories/product-journeys";
import { abbeyWorkspaceFacts, quesarSurfaces, setups } from "./categories/surfaces";
import type { JourneyLink } from "./schemas-surfaces";

type Journey = { status: string; hrefs: string[] };

// A journey link resolves to a product journey (abi, abbey, wdbx, quasar) or,
// for mobile, the start journey; both carry a status and one or two links.
function resolveJourney(link: JourneyLink): Journey {
  const product = productJourneys.find((item) => item.slug === link);
  const start = startJourneys.find((item) => item.id === link);
  const status = product?.status ?? (start && "status" in start ? start.status : undefined);
  if (!status) throw new Error(`journey ${link} has no status`);
  return {
    status,
    hrefs: [product?.setupHref, start?.href].filter((href) => href !== undefined),
  };
}

describe("surface and setup rows agree with the product journeys", () => {
  it("every linked surface carries its journey's status", () => {
    const linked = quesarSurfaces.filter((row) => "journey" in row);
    expect(linked.map((row) => row.journey)).toEqual(["quasar", "abbey", "mobile"]);
    for (const row of linked) {
      if (!("journey" in row)) continue;
      expect(row.status, row.surface).toBe(resolveJourney(row.journey).status);
    }
  });

  it("every linked setup card links its journey's setup page", () => {
    const linked = setups.filter((row) => "journey" in row);
    expect(linked.map((row) => row.journey)).toEqual(["abbey", "quasar", "mobile"]);
    for (const row of linked) {
      if (!("journey" in row)) continue;
      const { hrefs } = resolveJourney(row.journey);
      expect(hrefs.length, row.title).toBeGreaterThan(0);
      for (const href of hrefs) expect(row.href, row.title).toBe(href);
    }
  });

  it("the catalog's app surfaces carry the same statuses as the journeys", () => {
    const pairs: [string, JourneyLink][] = [
      ["quasar", "quasar"],
      ["workspace", "abbey"],
      ["mobile", "mobile"],
    ];
    for (const [id, link] of pairs) {
      const surface = appSurfaces.find((item) => item.id === id);
      expect(surface?.status, id).toBe(resolveJourney(link).status);
    }
  });

  it("the Abbey toolchain is stated once", () => {
    const abbey = productJourneys.find((item) => item.slug === "abbey");
    expect(abbey?.prerequisites).toBe(
      "Node 24, Bun 1.4, uv with Python 3.11–3.13, Java 21+ and LibreOffice as documented by the website-app setup; a local model is optional.",
    );
    expect(abbeyWorkspaceFacts.slice(0, abbeyRequirements.length)).toEqual([...abbeyRequirements]);
  });
});
