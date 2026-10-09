import { describe, expect, it } from "vitest";
import { assertPersistentBuildMode } from "./persistent-build-mode.ts";

describe("persistent build mode", () => {
  it("rejects a Pages flag inherited by the Node artifact build", () => {
    expect(() => assertPersistentBuildMode("persistent", "true")).toThrow(
      "Persistent server build cannot use VITE_STATIC_SITE=true.",
    );
  });

  it("allows an unset or false flag for persistent builds and keeps static mode intact", () => {
    expect(() => assertPersistentBuildMode("persistent", undefined)).not.toThrow();
    expect(() => assertPersistentBuildMode("persistent", "false")).not.toThrow();
    expect(() => assertPersistentBuildMode("static", "true")).not.toThrow();
    expect(() => assertPersistentBuildMode("production", "true")).not.toThrow();
  });
});
