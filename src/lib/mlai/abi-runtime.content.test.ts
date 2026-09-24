import { describe, expect, it } from "vitest";
import type { ZodType } from "zod";

import {
  abiCrateOrder,
  abiCrates,
  abiMcpToolOrder,
  abiModules,
  docsMcpTools,
  docsModuleMap,
  docsModuleOrder,
  docsWdbxCapabilities,
  mcpToolCatalog,
  mcpTools,
  wdbxCapabilities,
  wdbxCrateOrder,
  wdbxCrates,
  wdbxSpecs,
} from "./categories/abi-runtime";
import { runtime } from "./categories/platform";
import { benchmarkArchitecture, docsHub } from "./pages";
import {
  AbiModulesSchema,
  DocsWdbxCapabilitiesSchema,
  McpToolCatalogSchema,
  WdbxCapabilitiesSchema,
} from "./schemas-runtime";
import { wdbxFacts, wdbxGraphDefaults } from "./wdbx-facts";

// Same contract as content-schemas.test.ts: parsing is a no-op.
const datasets: [string, ZodType, unknown][] = [
  ["mcpToolCatalog", McpToolCatalogSchema, mcpToolCatalog],
  ["abiModules", AbiModulesSchema, abiModules],
  ["wdbxCapabilities", WdbxCapabilitiesSchema, wdbxCapabilities],
  ["docsWdbxCapabilities", DocsWdbxCapabilitiesSchema, docsWdbxCapabilities],
];

describe("abi-runtime datasets match their schemas", () => {
  it.each(datasets)("%s parses without error and without changes", (_name, schema, data) => {
    const result = schema.safeParse(data);
    expect(result.error?.issues ?? []).toEqual([]);
    expect(result.data).toStrictEqual(data);
  });
});

describe("MCP tool catalog", () => {
  it("lists the twelve contract-covered tools, each once", () => {
    const names = mcpToolCatalog.map((t) => t.name);
    expect(names).toHaveLength(12);
    expect(new Set(names).size).toBe(12);
  });

  it("shows on /abi exactly the tools with /abi wording, all from the catalog", () => {
    const withAbi = mcpToolCatalog.filter((t) => t.abiBody).map((t) => t.name);
    expect([...abiMcpToolOrder].sort()).toEqual([...withAbi].sort());
    expect(mcpTools.map((t) => t.name)).toEqual([...abiMcpToolOrder]);
  });

  it("feeds the docs hub the whole catalog", () => {
    expect(docsHub.mcpTools).toBe(docsMcpTools);
    expect(docsMcpTools.map((t) => t.name)).toEqual(mcpToolCatalog.map((t) => t.name));
  });
});

describe("crates", () => {
  it("names each crate once", () => {
    const names = abiModules.map((m) => m.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("derives each page's list in its order", () => {
    expect(abiCrates.map((c) => c.name)).toEqual([...abiCrateOrder]);
    expect(wdbxCrates.map((c) => c.name)).toEqual([...wdbxCrateOrder]);
    expect(docsModuleMap.map((c) => c.name)).toEqual([...docsModuleOrder]);
    expect(docsHub.moduleMap).toBe(docsModuleMap);
  });
});

describe("WDBX graph defaults", () => {
  const { index, m, efConstruction, efSearch, transactions } = wdbxGraphDefaults;

  it("reach every table that states them", () => {
    expect(runtime.memoryModel).toEqual(wdbxFacts.slice(1));
    expect(wdbxSpecs.slice(0, 5).map((r) => r.v)).toEqual([
      index,
      transactions,
      String(m),
      String(efConstruction),
      String(efSearch),
    ]);
    expect(benchmarkArchitecture.find((r) => r.property === "Index")?.value).toBe(
      `${index}; M=${m}, ef_construction=${efConstruction}, ef_search=${efSearch}`,
    );
  });

  it("render the docs hub cards without a status badge", () => {
    for (const card of docsHub.wdbxCapabilities)
      expect(Object.keys(card)).toEqual(["title", "body"]);
  });
});
