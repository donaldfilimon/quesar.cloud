import { describe, expect, it } from "vitest";
import { buildCsp, CSP_HEADER } from "./csp";

const prod = buildCsp({ dev: false });
const dev = buildCsp({ dev: true });

function directive(csp: string, name: string): string {
  const found = csp.split("; ").find((d) => d === name || d.startsWith(`${name} `));
  if (!found) throw new Error(`missing directive: ${name}`);
  return found;
}

describe("CSP policy (ported from mlai)", () => {
  it("ships as Report-Only", () => {
    expect(CSP_HEADER).toBe("Content-Security-Policy-Report-Only");
  });

  it("never ships 'unsafe-eval' in production", () => {
    for (const d of prod.split("; ")) expect(d.split(" ")).not.toContain("'unsafe-eval'");
  });

  it("grants 'unsafe-eval' and HMR websockets in development only", () => {
    expect(directive(dev, "script-src")).toContain("'unsafe-eval'");
    expect(directive(dev, "connect-src").split(" ")).toEqual(expect.arrayContaining(["ws:", "wss:"]));
    expect(directive(prod, "connect-src").split(" ")).not.toContain("ws:");
  });

  it("differs between dev and production only by the dev tokens", () => {
    expect(dev.replace(" 'unsafe-eval'", "").replace(" ws: wss:", "")).toBe(prod);
  });

  it("keeps 'wasm-unsafe-eval' in both: it is not the eval escape hatch", () => {
    expect(directive(prod, "script-src")).toContain("'wasm-unsafe-eval'");
  });

  it("allows framing only by the site itself", () => {
    for (const csp of [prod, dev]) expect(directive(csp, "frame-ancestors")).toBe("frame-ancestors 'self'");
  });

  it("locks down the object, base and form surface", () => {
    for (const csp of [prod, dev]) {
      expect(directive(csp, "object-src")).toBe("object-src 'none'");
      expect(directive(csp, "base-uri")).toBe("base-uri 'self'");
      expect(directive(csp, "form-action")).toBe("form-action 'self'");
      expect(directive(csp, "default-src")).toBe("default-src 'self'");
    }
  });

  it("never widens a directive to a bare https: or * wildcard", () => {
    for (const csp of [prod, dev]) {
      for (const d of csp.split("; ")) {
        expect(d.split(" ")).not.toContain("https:");
        expect(d.split(" ")).not.toContain("*");
      }
    }
  });

  it("no longer allows the Grok App Builder origins", () => {
    for (const csp of [prod, dev]) expect(csp).not.toContain("grok.com");
  });

  it("keeps the external origins the real runtime surface needs", () => {
    // Kokoro neural voice, team avatars, Google Fonts.
    expect(directive(prod, "script-src")).toContain("https://cdn.jsdelivr.net");
    expect(directive(prod, "connect-src")).toContain("https://cdn.jsdelivr.net");
    expect(directive(prod, "connect-src")).toContain("https://huggingface.co");
    expect(directive(prod, "img-src")).toContain("https://avatars.githubusercontent.com");
    expect(directive(prod, "style-src")).toContain("https://fonts.googleapis.com");
    expect(directive(prod, "font-src")).toContain("https://fonts.gstatic.com");
  });

  it("keeps the Cloudflare Turnstile challenge surface", () => {
    for (const csp of [prod, dev]) {
      expect(directive(csp, "script-src")).toContain("https://challenges.cloudflare.com");
      expect(directive(csp, "frame-src")).toContain("https://challenges.cloudflare.com");
    }
  });

  it("keeps violation reporting on both directives", () => {
    for (const csp of [prod, dev]) {
      expect(directive(csp, "report-to")).toBe("report-to csp-endpoint");
      expect(directive(csp, "report-uri")).toBe("report-uri /api/csp-report");
    }
  });
});
