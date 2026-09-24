import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { contrastRatio, readThemeTokens } from "./color-contrast";

// Guards the "AA for every text pair" promise in src/styles.css.
const css = readFileSync(fileURLToPath(new URL("../styles.css", import.meta.url)), "utf8");

const themes = {
  light: readThemeTokens(css, `:root, [data-theme="light"]`),
  dark: readThemeTokens(css, `[data-theme="dark"]`),
};

const textTokens = ["--fg", "--fg-muted", "--fg-subtle", "--muted-foreground"];
const surfaces = ["--bg", "--card", "--muted"];
const textPairs = textTokens.flatMap((fg) => surfaces.map((bg) => [fg, bg] as const));

describe.each(Object.entries(themes))("%s theme contrast (WCAG AA)", (_name, tokens) => {
  it.each(textPairs)("%s on %s is at least 4.5:1", (fg, bg) => {
    expect(tokens[fg], fg).toBeDefined();
    expect(tokens[bg], bg).toBeDefined();
    expect(contrastRatio(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(["--bg", "--card"])("--ring on %s is at least 3:1", (bg) => {
    expect(contrastRatio(tokens["--ring"], tokens[bg])).toBeGreaterThanOrEqual(3);
  });
});
