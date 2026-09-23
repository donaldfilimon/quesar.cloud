import { describe, expect, it } from "vitest";
import { architectureNodes } from "./content";
import { ARCHITECTURE_NODE_IDS, isArchitectureNodeId } from "./architecture-node-ids";

describe("architecture node ids", () => {
  it("match the node catalog exactly, in order", () => {
    expect([...ARCHITECTURE_NODE_IDS]).toEqual(architectureNodes.map((node) => node.id));
  });

  it("accept catalog ids and reject everything else", () => {
    expect(isArchitectureNodeId("wdbx")).toBe(true);
    expect(isArchitectureNodeId("nope")).toBe(false);
    expect(isArchitectureNodeId(3)).toBe(false);
  });
});
